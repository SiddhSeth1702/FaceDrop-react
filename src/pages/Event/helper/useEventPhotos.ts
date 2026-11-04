import { useCallback, useEffect, useRef, useState } from "react";
import useRequestToServer from "@/service/httpService";
import { deleteFileUrl, eventPhotosUrl, retryPhotosUrl } from "@/service/requestUrls.service";

export type PhotoStatus = "ready" | "processing" | "failed";
export type PhotoFilter = "all" | PhotoStatus;

export interface EventPhoto {
  file_id: number;
  file_name: string;
  file_size: number;
  status: PhotoStatus;
  face_count: number;
  error: string | null;
  thumb_url: string | null;
  display_url: string | null;
}

export interface PhotoCounts {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

interface PhotosPage {
  result: EventPhoto[];
  pagination: { page: number; next: number | null; total: number };
  counts: PhotoCounts;
}

const PAGE_SIZE = 90;
const POLL_MS = 3000;
/** The API accepts at most 500 ids per status check; the newest ones matter most. */
const MAX_POLL_IDS = 200;
const EMPTY_COUNTS: PhotoCounts = { total: 0, ready: 0, processing: 0, failed: 0 };

/** Placeholder for a photo that just finished uploading and is waiting for the server to process it. */
const pendingPhoto = (fileId: number, name: string, size: number): EventPhoto => ({
  file_id: fileId,
  file_name: name,
  file_size: size,
  status: "processing",
  face_count: 0,
  error: null,
  thumb_url: null,
  display_url: null,
});

/** Paged photo list for one event, kept fresh by polling only the photos that are still processing. */
export const useEventPhotos = (eventId: number | undefined, onCountsChange?: (counts: PhotoCounts) => void) => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const countsCallbackRef = useRef(onCountsChange);
  countsCallbackRef.current = onCountsChange;

  const [filter, setFilter] = useState<PhotoFilter>("all");
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [counts, setCounts] = useState<PhotoCounts>(EMPTY_COUNTS);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadingRef = useRef(false);
  // Bumped when the list resets, so a response for the old filter is dropped
  const generationRef = useRef(0);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const updateCounts = useCallback((next: PhotoCounts) => {
    setCounts(next);
    countsCallbackRef.current?.(next);
  }, []);

  const fetchPage = useCallback(
    async (page: number, activeFilter: PhotoFilter, ids?: number[]) => {
      if (!eventId) return null;
      const params = new URLSearchParams({ page: String(page), limit: String(ids ? ids.length : PAGE_SIZE) });
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (ids) params.set("ids", ids.join(","));
      const response = await requestRef.current(`${eventPhotosUrl(eventId)}?${params}`, {}, "GET");
      if (response.status >= 400) throw new Error(response.data?.message || "Couldn't load photos");
      return response.data?.data as PhotosPage;
    },
    [eventId]
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || nextPage === null) return;
    loadingRef.current = true;
    setLoading(true);
    const generation = generationRef.current;
    try {
      const page = await fetchPage(nextPage, filter);
      if (!page || generation !== generationRef.current) return;
      setPhotos((prev) => {
        // New uploads shift offsets, so the same photo can come back on a later page
        const seen = new Set(prev.map((p) => p.file_id));
        return [...prev, ...page.result.filter((p) => !seen.has(p.file_id))];
      });
      setNextPage(page.pagination.next);
      updateCounts(page.counts);
    } catch (error) {
      console.error(error);
    } finally {
      // A stale response must not mark the fresh list as loaded
      if (generation === generationRef.current) {
        loadingRef.current = false;
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [fetchPage, filter, nextPage, updateCounts]);

  // Start over whenever the event or the filter changes
  useEffect(() => {
    generationRef.current++;
    loadingRef.current = false;
    setPhotos([]);
    setNextPage(1);
    setLoaded(false);
  }, [eventId, filter]);

  useEffect(() => {
    if (nextPage === 1 && !loaded) void loadMore();
  }, [nextPage, loaded, loadMore]);

  // Poll only the photos on screen that are still processing
  const hasProcessing = photos.some((p) => p.status === "processing") || counts.processing > 0;
  useEffect(() => {
    if (!eventId || !hasProcessing) return;
    const timer = setInterval(async () => {
      const ids = photosRef.current.filter((p) => p.status === "processing").slice(0, MAX_POLL_IDS).map((p) => p.file_id);
      try {
        if (ids.length) {
          const page = await fetchPage(1, "all", ids);
          if (!page) return;
          const updates = new Map(page.result.map((p) => [p.file_id, p]));
          setPhotos((prev) =>
            prev
              .map((p) => updates.get(p.file_id) ?? p)
              // In a filtered view, photos that changed state leave the list
              .filter((p) => filter === "all" || p.status === filter || !updates.has(p.file_id))
          );
          updateCounts(page.counts);
        } else {
          // Photos processing beyond the loaded pages: keep the counters moving
          const page = await fetchPage(1, "all", undefined);
          if (page) updateCounts(page.counts);
        }
      } catch {
        // Try again on the next tick
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [eventId, hasProcessing, fetchPage, filter, updateCounts]);

  /** Show freshly uploaded photos right away, before the server has processed them. */
  const addUploaded = useCallback(
    (uploaded: { fileId: number; name: string; size: number }[]) => {
      if (filter !== "all" && filter !== "processing") return;
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.file_id));
        const fresh = uploaded.filter((u) => !seen.has(u.fileId)).map((u) => pendingPhoto(u.fileId, u.name, u.size));
        return [...fresh.reverse(), ...prev];
      });
      setCounts((prev) => {
        const next = { ...prev, total: prev.total + uploaded.length, processing: prev.processing + uploaded.length };
        countsCallbackRef.current?.(next);
        return next;
      });
    },
    [filter]
  );

  const deletePhotos = useCallback(
    async (fileIds: number[]) => {
      const response = await requestRef.current(deleteFileUrl, { fileId: fileIds }, "DELETE");
      if (response.status >= 400) throw new Error(response.data?.message || "Couldn't delete the photos");
      const removed = new Set(fileIds);
      const gone = photosRef.current.filter((p) => removed.has(p.file_id));
      setPhotos((prev) => prev.filter((p) => !removed.has(p.file_id)));
      setCounts((prev) => {
        const next = { ...prev };
        for (const photo of gone) {
          next.total--;
          next[photo.status]--;
        }
        countsCallbackRef.current?.(next);
        return next;
      });
    },
    []
  );

  /** Re-queue failed photos (all of them, or just the given ones). */
  const retryFailed = useCallback(
    async (fileIds?: number[]) => {
      if (!eventId) return 0;
      const response = await requestRef.current(retryPhotosUrl(eventId), fileIds ? { fileIds } : {}, "POST");
      if (response.status >= 400) throw new Error(response.data?.message || "Couldn't retry the photos");
      const queued: number = response.data?.data?.queued ?? 0;
      const retried = fileIds ? new Set(fileIds) : null;
      setPhotos((prev) =>
        prev.map((p) =>
          p.status === "failed" && (!retried || retried.has(p.file_id)) ? { ...p, status: "processing", error: null } : p
        )
      );
      setCounts((prev) => {
        const moved = Math.min(queued, prev.failed);
        const next = { ...prev, failed: prev.failed - moved, processing: prev.processing + moved };
        countsCallbackRef.current?.(next);
        return next;
      });
      return queued;
    },
    [eventId]
  );

  return {
    photos,
    counts,
    filter,
    setFilter,
    loading,
    loaded,
    hasMore: nextPage !== null,
    loadMore,
    addUploaded,
    deletePhotos,
    retryFailed,
  };
};
