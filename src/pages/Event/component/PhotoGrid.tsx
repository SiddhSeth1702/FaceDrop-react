import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, RotateCcw, ScanFace, Trash2, X } from "lucide-react";
import { Grid, GridCellProps, WindowScroller } from "react-virtualized";
import "react-virtualized/styles.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventPhoto, PhotoCounts, PhotoFilter } from "../helper/useEventPhotos";

interface PhotoGridProps {
  photos: EventPhoto[];
  counts: PhotoCounts;
  filter: PhotoFilter;
  onFilterChange: (filter: PhotoFilter) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Whether photos can still be deleted or retried (false once the event has expired). */
  editable: boolean;
  maxPhotos?: number;
  onDelete: (fileIds: number[]) => Promise<void>;
  onRetry: (fileIds?: number[]) => Promise<void>;
  onAddMore?: () => void;
}

const FILTERS: { value: PhotoFilter; label: string; count: (c: PhotoCounts) => number }[] = [
  { value: "all", label: "All", count: (c) => c.total },
  { value: "ready", label: "Ready", count: (c) => c.ready },
  { value: "processing", label: "Processing", count: (c) => c.processing },
  { value: "failed", label: "Failed", count: (c) => c.failed },
];

const GAP = 8;
const MIN_TILE = 132;

/** 3 columns on phones, then as many ~132px+ tiles as fit, up to 8. */
const getColumnCount = (width: number) => {
  if (width < 480) return 3;
  return Math.min(8, Math.max(4, Math.floor((width + GAP) / (MIN_TILE + GAP))));
};

export const PhotoGrid = ({
  photos,
  counts,
  filter,
  onFilterChange,
  loading,
  hasMore,
  onLoadMore,
  editable,
  maxPhotos,
  onDelete,
  onRetry,
  onAddMore,
}: PhotoGridProps) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Selection only makes sense within the current list
  useEffect(() => setSelected(new Set()), [filter]);

  const toggle = useCallback((fileId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const viewable = useMemo(() => photos.filter((p) => p.status === "ready" && p.display_url), [photos]);
  const openPhoto = useCallback(
    (fileId: number) => {
      const index = viewable.findIndex((p) => p.file_id === fileId);
      if (index >= 0) setLightboxIndex(index);
    },
    [viewable]
  );

  const runBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () =>
    runBusy(async () => {
      await onDelete([...selected]);
      setSelected(new Set());
    });

  const allSelected = photos.length > 0 && selected.size === photos.length;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-3 sm:px-5">
        <h3 className="text-lg font-bold">
          Photos{" "}
          <span className="font-mono text-sm font-medium text-muted-foreground">
            {maxPhotos ? `${counts.total.toLocaleString("en-IN")} / ${maxPhotos.toLocaleString("en-IN")}` : counts.total.toLocaleString("en-IN")}
          </span>
        </h3>

        <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1" role="tablist" aria-label="Filter photos">
          {FILTERS.filter((f) => f.value === "all" || f.value === filter || f.count(counts) > 0).map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                filter === f.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className={cn("ml-1.5 font-mono", f.value === "failed" && f.count(counts) > 0 && "text-destructive")}>
                {f.count(counts).toLocaleString("en-IN")}
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {editable && photos.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selected.size > 0 && !allSelected;
                }}
                onChange={(e) => setSelected(e.target.checked ? new Set(photos.map((p) => p.file_id)) : new Set())}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              Select
            </label>
          )}
          {selected.size > 0 && (
            <Button onClick={handleDelete} variant="destructive" size="sm" disabled={busy}>
              <Trash2 />
              Delete {selected.size}
            </Button>
          )}
          {editable && counts.failed > 0 && selected.size === 0 && (
            <Button onClick={() => runBusy(() => onRetry())} variant="outline" size="sm" disabled={busy}>
              <RotateCcw />
              Retry failed
            </Button>
          )}
          {onAddMore && (
            <Button onClick={onAddMore} variant="outline" size="sm">
              <ImagePlus />
              Add photos
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {photos.length > 0 ? (
          <VirtualGrid
            photos={photos}
            selected={selected}
            selectable={editable}
            onToggle={toggle}
            onOpen={openPhoto}
            onRetry={editable ? (id) => void onRetry([id]) : undefined}
            onNearEnd={hasMore && !loading ? onLoadMore : undefined}
          />
        ) : (
          !loading && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {filter === "failed" ? "No failed photos. Nice." : filter === "processing" ? "Nothing is processing right now." : "No photos here yet."}
            </p>
          )
        )}
        {loading && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      {lightboxIndex !== null && viewable[lightboxIndex] && (
        <Lightbox
          photos={viewable}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

interface VirtualGridProps {
  photos: EventPhoto[];
  selected: Set<number>;
  selectable: boolean;
  onToggle: (fileId: number) => void;
  onOpen: (fileId: number) => void;
  onRetry?: (fileId: number) => void;
  /** Called when the last rows come into view. */
  onNearEnd?: () => void;
}

const VirtualGrid = ({ photos, selected, selectable, onToggle, onOpen, onRetry, onNearEnd }: VirtualGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid>(null);
  const [width, setWidth] = useState(0);

  // Track the container, not the window: the sidebar and right rail change the space available
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnCount = width ? getColumnCount(width) : 1;
  const columnWidth = width ? (width + GAP) / columnCount : 0;
  const rowCount = Math.ceil(photos.length / columnCount);

  useEffect(() => {
    gridRef.current?.recomputeGridSize();
  }, [columnWidth, columnCount]);

  // Tiles re-render when status, thumbnail or selection change
  useEffect(() => {
    gridRef.current?.forceUpdate();
  }, [photos, selected]);

  const cellRenderer = ({ columnIndex, rowIndex, key, style }: GridCellProps) => {
    const photo = photos[rowIndex * columnCount + columnIndex];
    if (!photo) return null;
    return (
      <div key={key} style={{ ...style, paddingRight: GAP, paddingBottom: GAP }}>
        <PhotoTile
          key={photo.file_id}
          photo={photo}
          isSelected={selected.has(photo.file_id)}
          selectable={selectable}
          onToggle={onToggle}
          onOpen={onOpen}
          onRetry={onRetry}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <WindowScroller>
          {({ height, isScrolling, onChildScroll, scrollTop, registerChild }) => (
            <div ref={registerChild} style={{ marginRight: -GAP }}>
              <Grid
                ref={gridRef}
                autoHeight
                height={height || 600}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                scrollTop={scrollTop}
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={columnWidth}
                width={width + GAP}
                overscanRowCount={4}
                cellRenderer={cellRenderer}
                onSectionRendered={({ rowStopIndex }) => {
                  if (onNearEnd && rowStopIndex >= rowCount - 4) onNearEnd();
                }}
                style={{ outline: "none" }}
              />
            </div>
          )}
        </WindowScroller>
      )}
    </div>
  );
};

interface PhotoTileProps {
  photo: EventPhoto;
  isSelected: boolean;
  selectable: boolean;
  onToggle: (fileId: number) => void;
  onOpen: (fileId: number) => void;
  onRetry?: (fileId: number) => void;
}

const PhotoTile = React.memo(({ photo, isSelected, selectable, onToggle, onOpen, onRetry }: PhotoTileProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const ready = photo.status === "ready" && photo.thumb_url && !imageFailed;

  return (
    <div
      className={cn(
        "group relative h-full w-full overflow-hidden rounded-lg bg-secondary",
        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:shadow-lift"
      )}
      title={photo.error ? `${photo.file_name}: ${photo.error}` : photo.file_name}
    >
      {ready ? (
        <button type="button" onClick={() => onOpen(photo.file_id)} className="h-full w-full" aria-label={`Open ${photo.file_name}`}>
          <img
            src={photo.thumb_url!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        </button>
      ) : photo.status === "failed" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-danger/50 p-2 text-center">
          <AlertCircle className="h-5 w-5 text-danger-foreground" />
          <span className="line-clamp-2 text-[11px] font-medium text-danger-foreground">{photo.error || "Couldn't process"}</span>
          {onRetry && (
            <button
              type="button"
              onClick={() => onRetry(photo.file_id)}
              className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold shadow-sm hover:bg-secondary"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      ) : (
        // Waiting for the server: shimmer with the file name
        <div className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-1.5 p-2 text-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="line-clamp-2 break-all text-[10.5px] text-muted-foreground">{photo.file_name}</span>
        </div>
      )}

      {selectable && (
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={`Select ${photo.file_name}`}
          onClick={() => onToggle(photo.file_id)}
          className={cn(
            "absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md border-2 shadow-sm transition-[opacity,colors]",
            isSelected
              ? "border-primary bg-primary text-primary-foreground opacity-100"
              : "border-white bg-white/90 opacity-0 hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
          )}
        >
          {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>
      )}

      {/* Photos with no detectable face can never be found by guests: worth flagging */}
      {photo.status === "ready" && photo.face_count === 0 && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          no faces
        </span>
      )}
      {photo.status === "ready" && photo.face_count > 0 && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ScanFace className="h-3 w-3" />
          {photo.face_count}
        </span>
      )}
    </div>
  );
});

PhotoTile.displayName = "PhotoTile";

interface LightboxProps {
  photos: EventPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const Lightbox = ({ photos, index, onIndexChange, onClose }: LightboxProps) => {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onIndexChange, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <figure className="relative flex max-h-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          key={photo.file_id}
          src={photo.display_url!}
          alt={photo.file_name}
          className="max-h-[82vh] max-w-full rounded-lg object-contain"
          // The thumbnail is already cached, so show it while the large copy loads
          style={{ backgroundImage: `url(${photo.thumb_url})`, backgroundSize: "cover" }}
        />
        <figcaption className="mt-3 text-center text-sm text-white/70">
          {photo.file_name} · {photo.face_count} {photo.face_count === 1 ? "face" : "faces"} · {index + 1} of {photos.length}
        </figcaption>
      </figure>
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      {hasPrev && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
          aria-label="Next photo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
