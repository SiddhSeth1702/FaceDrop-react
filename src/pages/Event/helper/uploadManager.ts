import { cancelUploadUrl, completeUploadUrl, initateUploadUrl, partCompletetUploadUrl } from "@/service/requestUrls.service";

/**
 * Uploads photos straight to S3 through presigned URLs, outside React.
 *
 * One manager per event lives in a module-level registry, so uploads keep going when the
 * photographer moves to another page in the app, and pick up their progress when they come back.
 * Each finished upload is handed to the server's processing queue by the `complete` call.
 */

export type UploadTaskStatus = "queued" | "uploading" | "done" | "error" | "canceled";

export interface UploadTask {
  id: string;
  file: File;
  status: UploadTaskStatus;
  /** Bytes sent so far. */
  loaded: number;
  fileId?: number;
  error?: string;
}

export interface UploadSnapshot {
  tasks: UploadTask[];
  total: number;
  done: number;
  failed: number;
  active: number;
  queued: number;
  totalBytes: number;
  loadedBytes: number;
  /** Upload speed over the last few seconds, in bytes per second. */
  bytesPerSecond: number;
  /** Set when the server refused more photos for this event. */
  limitReached: boolean;
}

/** Same contract as useRequestToServer: 4xx responses resolve with their status instead of throwing. */
type Api = (url: string, data: unknown, method: string) => Promise<{ status: number; data?: { message?: string; data?: unknown } }>;

const PARALLEL_UPLOADS = 6;
/** Up to this size a photo goes up in one PUT; bigger files use resumable multipart. */
const SINGLE_PUT_LIMIT = 50 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const NOTIFY_INTERVAL_MS = 200;

class LimitReachedError extends Error {}

const mimeTypeOf = (file: File) => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "application/octet-stream";
};

export const isPhotoFile = (file: File) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class UploadManager {
  private tasks: UploadTask[] = [];
  private controllers = new Map<string, AbortController>();
  private listeners = new Set<(snapshot: UploadSnapshot) => void>();
  private uploadedListeners = new Set<(fileIds: number[]) => void>();
  private active = 0;
  private limitReached = false;
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private speedSamples: { at: number; bytes: number }[] = [];
  private api: Api;
  private snapshot: UploadSnapshot;
  /** Event name, shown by the sidebar upload indicator. */
  label = "";

  constructor(private readonly eventId: number, api: Api) {
    this.api = api;
    this.snapshot = this.buildSnapshot();
  }

  /** Keep the latest request function (it carries the current auth token). */
  setApi(api: Api) {
    this.api = api;
  }

  getSnapshot = () => this.snapshot;

  subscribe(listener: (snapshot: UploadSnapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Called with server file ids as soon as photos finish uploading and enter processing. */
  onUploaded(listener: (fileIds: number[]) => void) {
    this.uploadedListeners.add(listener);
    return () => {
      this.uploadedListeners.delete(listener);
    };
  }

  get isBusy() {
    return this.tasks.some((t) => t.status === "queued" || t.status === "uploading");
  }

  add(files: File[]) {
    this.limitReached = false;
    const stamp = Date.now();
    const tasks = files.map((file, i) => ({
      id: `${stamp}-${i}-${file.name}`,
      file,
      status: "queued" as const,
      loaded: 0,
    }));
    this.tasks.push(...tasks);
    this.notify(true);
    this.pump();
  }

  cancel(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task || task.status === "done" || task.status === "canceled") return;
    this.controllers.get(id)?.abort();
    this.controllers.delete(id);
    task.status = "canceled";
    if (task.fileId) void this.api(cancelUploadUrl, { fileId: task.fileId }, "POST").catch(() => undefined);
    this.notify(true);
  }

  cancelAll() {
    this.tasks.filter((t) => t.status === "queued" || t.status === "uploading").forEach((t) => this.cancel(t.id));
  }

  retryFailed() {
    this.limitReached = false;
    for (const task of this.tasks) {
      if (task.status === "error") {
        task.status = "queued";
        task.loaded = 0;
        task.error = undefined;
      }
    }
    this.notify(true);
    this.pump();
  }

  /** Forget finished, failed and canceled uploads once the batch is over. */
  clearFinished() {
    this.tasks = this.tasks.filter((t) => t.status === "queued" || t.status === "uploading");
    this.speedSamples = [];
    this.notify(true);
  }

  private pump() {
    while (this.active < PARALLEL_UPLOADS && !this.limitReached) {
      const next = this.tasks.find((t) => t.status === "queued");
      if (!next) break;
      next.status = "uploading";
      this.active++;
      void this.run(next).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  private async run(task: UploadTask) {
    const controller = new AbortController();
    this.controllers.set(task.id, controller);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (task.file.size <= SINGLE_PUT_LIMIT) await this.uploadSingle(task, controller);
        else await this.uploadMultipart(task, controller);
        if (controller.signal.aborted) return;

        task.status = "done";
        task.loaded = task.file.size;
        this.uploadedListeners.forEach((listener) => listener([task.fileId!]));
        break;
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof LimitReachedError) {
          this.stopForLimit(task, error.message);
          break;
        }
        // A single PUT starts over with a new file record, so release the half-finished one
        // (it would otherwise count towards the event's photo limit). Multipart keeps it to resume.
        if (task.fileId && task.file.size <= SINGLE_PUT_LIMIT) {
          void this.api(cancelUploadUrl, { fileId: task.fileId }, "POST").catch(() => undefined);
          task.fileId = undefined;
        }
        if (attempt === MAX_ATTEMPTS) {
          task.status = "error";
          task.error = error instanceof Error ? error.message : "Upload failed";
        } else {
          task.loaded = 0;
          await wait(1000 * 2 ** attempt);
        }
      }
    }

    this.controllers.delete(task.id);
    this.notify(true);
  }

  private stopForLimit(task: UploadTask, message: string) {
    this.limitReached = true;
    task.status = "error";
    task.error = message;
    // Nothing else in the queue can go up either
    for (const other of this.tasks) {
      if (other.status === "queued") {
        other.status = "error";
        other.error = message;
      }
    }
  }

  /** POST to the API and unwrap `data.data`, turning error statuses into exceptions. */
  private async call<T>(url: string, body: unknown): Promise<T> {
    const response = await this.api(url, body, "POST");
    if (response.status === 403 && url === initateUploadUrl) {
      throw new LimitReachedError(response.data?.message || "This event has reached its photo limit.");
    }
    if (response.status >= 400) throw new Error(response.data?.message || `Request failed (${response.status})`);
    return response.data?.data as T;
  }

  private async uploadSingle(task: UploadTask, controller: AbortController) {
    const init = await this.call<{ file_id: number; url: string }>(initateUploadUrl, {
      fileName: task.file.name,
      fileSize: task.file.size,
      mimeType: mimeTypeOf(task.file),
      eventId: this.eventId,
      single: true,
    });
    task.fileId = init.file_id;

    await this.put(init.url, task.file, controller, (loaded) => {
      task.loaded = loaded;
      this.notify();
    }, mimeTypeOf(task.file));
    if (controller.signal.aborted) return;

    await this.call(completeUploadUrl, { fileId: task.fileId, single: true });
  }

  private async uploadMultipart(task: UploadTask, controller: AbortController) {
    const init = await this.call<{
      file_id: number;
      urls: { url: string; partNumber: number }[];
      uploadedParts?: number[];
    }>(initateUploadUrl, {
      fileName: task.file.name,
      fileSize: task.file.size,
      mimeType: mimeTypeOf(task.file),
      eventId: this.eventId,
      // Resumes the parts that already made it when this is a retry
      fileId: task.fileId,
    });
    task.fileId = init.file_id;

    const done = new Set(init.uploadedParts ?? []);
    const partBytes = new Map<number, number>();
    for (const part of done) partBytes.set(part, Math.min(CHUNK_SIZE, task.file.size - (part - 1) * CHUNK_SIZE));

    const pending = init.urls.filter((part) => !done.has(part.partNumber));
    const updateLoaded = () => {
      task.loaded = [...partBytes.values()].reduce((sum, n) => sum + n, 0);
      this.notify();
    };

    const worker = async () => {
      while (pending.length && !controller.signal.aborted) {
        const { url, partNumber } = pending.shift()!;
        const start = (partNumber - 1) * CHUNK_SIZE;
        const chunk = task.file.slice(start, Math.min(start + CHUNK_SIZE, task.file.size));
        const etag = await this.put(url, chunk, controller, (loaded) => {
          partBytes.set(partNumber, loaded);
          updateLoaded();
        });
        if (controller.signal.aborted) return;
        await this.call(partCompletetUploadUrl, { fileId: task.fileId, partNumber, etag, sizeBytes: chunk.size });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (controller.signal.aborted) return;

    await this.call(completeUploadUrl, { fileId: task.fileId, single: false });
  }

  /** PUT a blob to a presigned URL and resolve with its ETag. */
  private put(
    url: string,
    body: Blob,
    controller: AbortController,
    onProgress: (loaded: number) => void,
    contentType?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      if (contentType) xhr.setRequestHeader("Content-Type", contentType);
      controller.signal.addEventListener("abort", () => xhr.abort(), { once: true });
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve((xhr.getResponseHeader("ETag") || "").replace(/"/g, ""));
        else reject(new Error(`Storage rejected the upload (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Network error while uploading"));
      xhr.onabort = () => resolve("");
      xhr.send(body);
    });
  }

  /** Progress events fire constantly; listeners hear about them at most every 200ms. */
  private notify(immediate = false) {
    if (immediate) {
      if (this.notifyTimer) clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
      this.emit();
      return;
    }
    if (this.notifyTimer) return;
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      this.emit();
    }, NOTIFY_INTERVAL_MS);
  }

  private emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener(this.snapshot));
    notifyGlobal();
  }

  get id() {
    return this.eventId;
  }

  private buildSnapshot(): UploadSnapshot {
    let done = 0;
    let failed = 0;
    let active = 0;
    let queued = 0;
    let totalBytes = 0;
    let loadedBytes = 0;
    for (const task of this.tasks) {
      if (task.status === "canceled") continue;
      totalBytes += task.file.size;
      loadedBytes += task.status === "done" ? task.file.size : task.loaded;
      if (task.status === "done") done++;
      else if (task.status === "error") failed++;
      else if (task.status === "uploading") active++;
      else if (task.status === "queued") queued++;
    }

    const now = Date.now();
    this.speedSamples.push({ at: now, bytes: loadedBytes });
    this.speedSamples = this.speedSamples.filter((s) => now - s.at <= 5000);
    const oldest = this.speedSamples[0];
    const seconds = oldest ? (now - oldest.at) / 1000 : 0;
    const bytesPerSecond = seconds > 0.5 ? Math.max(0, (loadedBytes - oldest.bytes) / seconds) : 0;

    return {
      tasks: [...this.tasks],
      total: done + failed + active + queued,
      done,
      failed,
      active,
      queued,
      totalBytes,
      loadedBytes,
      bytesPerSecond,
      limitReached: this.limitReached,
    };
  }
}

const managers = new Map<number, UploadManager>();

/* Everything below feeds the sidebar's "uploading…" indicator across all events. */

export interface UploadSummary {
  eventId: number;
  label: string;
  done: number;
  total: number;
  failed: number;
  inFlight: boolean;
  percent: number;
}

const globalListeners = new Set<() => void>();
let globalSummary: UploadSummary[] = [];

function notifyGlobal() {
  globalSummary = [...managers.values()]
    .map((m) => {
      const s = m.getSnapshot();
      return {
        eventId: m.id,
        label: m.label,
        done: s.done,
        total: s.total,
        failed: s.failed,
        inFlight: s.active + s.queued > 0,
        percent: s.totalBytes ? Math.round((s.loadedBytes / s.totalBytes) * 100) : 0,
      };
    })
    // Running batches, plus finished ones with failures the photographer should look at
    .filter((summary) => summary.inFlight || summary.failed > 0);
  globalListeners.forEach((listener) => listener());
}

export const subscribeToAllUploads = (listener: () => void) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};

/** Stable between changes, so it works with useSyncExternalStore. */
export const getAllUploads = () => globalSummary;

/** The upload manager for an event, created on first use. */
export const getUploadManager = (eventId: number, api: Api) => {
  let manager = managers.get(eventId);
  if (!manager) {
    manager = new UploadManager(eventId, api);
    managers.set(eventId, manager);
  } else {
    manager.setApi(api);
  }
  return manager;
};

/** True while any event still has photos going up; used to warn before closing the tab. */
export const hasActiveUploads = () => [...managers.values()].some((m) => m.isBusy);

window.addEventListener("beforeunload", (e) => {
  if (!hasActiveUploads()) return;
  e.preventDefault();
  e.returnValue = "";
});
