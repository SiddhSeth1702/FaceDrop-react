import { AlertCircle, Check, Loader2, RotateCcw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { UploadSnapshot } from "../helper/uploadManager";

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatEta = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return "under a minute left";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `about ${minutes} min left`;
  return `about ${Math.floor(minutes / 60)} h ${minutes % 60} min left`;
};

interface UploadTrayProps {
  snapshot: UploadSnapshot;
  onRetryFailed: () => void;
  onCancelAll: () => void;
  onDismiss: () => void;
}

/** Summary of the current upload batch: one progress bar, speed and time left, plus failures. */
export const UploadTray = ({ snapshot, onRetryFailed, onCancelAll, onDismiss }: UploadTrayProps) => {
  const { total, done, failed, active, queued, totalBytes, loadedBytes, bytesPerSecond, limitReached } = snapshot;
  if (total === 0) return null;

  const inFlight = active + queued > 0;
  const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
  const eta = inFlight && bytesPerSecond > 0 ? formatEta((totalBytes - loadedBytes) / bytesPerSecond) : null;
  const failedTasks = snapshot.tasks.filter((t) => t.status === "error");

  return (
    <div className={cn("rounded-2xl border bg-card px-4 py-3.5 sm:px-5", failed > 0 && !inFlight && "border-destructive/30")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            inFlight ? "bg-accent text-accent-foreground" : failed ? "bg-danger text-danger-foreground" : "bg-live text-live-foreground"
          )}
        >
          {inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : failed ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={3} />}
        </span>

        <div className="min-w-[220px] flex-1">
          <p className="text-sm font-semibold">
            {inFlight
              ? `Uploading ${done.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} photos`
              : failed
                ? `${done.toLocaleString("en-IN")} uploaded, ${failed.toLocaleString("en-IN")} didn't make it`
                : `${done.toLocaleString("en-IN")} ${done === 1 ? "photo" : "photos"} uploaded`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {inFlight
              ? [
                  `${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}`,
                  bytesPerSecond > 0 && `${formatBytes(bytesPerSecond)}/s`,
                  eta,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Faces are matched as each photo arrives, so guests can already search the ready ones."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {failed > 0 && !limitReached && (
            <Button size="sm" variant="outline" onClick={onRetryFailed}>
              <RotateCcw />
              Retry {failed}
            </Button>
          )}
          {inFlight ? (
            <Button size="sm" variant="ghost" onClick={onCancelAll}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="Dismiss upload summary">
              <X />
            </Button>
          )}
        </div>
      </div>

      {inFlight && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      )}

      {limitReached && (
        <p className="mt-3 rounded-lg bg-warn px-3 py-2 text-sm text-warn-foreground">
          This event is full, so the remaining photos weren't uploaded.{" "}
          <Link to={ROUTES.plans} className="font-semibold underline">
            See plans
          </Link>
        </p>
      )}

      {!inFlight && failedTasks.length > 0 && !limitReached && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Show the failed files</summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-2">
            {failedTasks.slice(0, 200).map((task) => (
              <li key={task.id} className="flex justify-between gap-3">
                <span className="truncate">{task.file.name}</span>
                <span className="shrink-0 text-xs text-destructive">{task.error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
