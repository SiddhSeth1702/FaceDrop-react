import { useEffect, useState } from "react";
import { Check, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { EventRow } from "@/pages/Insights/helper/insights";
import { refKey, StudioPhotoRef } from "../helper/studio";
import { StudioPhoto } from "../helper/useStudioSource";

interface PhotoPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** "single" picks one photo (the cover); "multi" picks up to `max`. */
  mode: "single" | "multi";
  max?: number;
  initial: StudioPhotoRef[];
  loved: StudioPhoto[];
  events: EventRow[];
  loadEventPhotos: (eventId: number) => Promise<StudioPhoto[]>;
  onDone: (picked: StudioPhotoRef[]) => void;
}

const LOVED = "loved";

/** Choose photos from the most-loved list or from any event. Order of picking is the order on the page. */
export const PhotoPicker = ({ open, onOpenChange, title, description, mode, max = 1, initial, loved, events, loadEventPhotos, onDone }: PhotoPickerProps) => {
  const [source, setSource] = useState<string>(LOVED);
  const [photos, setPhotos] = useState<StudioPhoto[]>(loved);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<StudioPhotoRef[]>(initial);

  // Start fresh each time it opens
  useEffect(() => {
    if (!open) return;
    setPicked(initial);
    setSource(loved.length ? LOVED : String(events[0]?.event_id ?? LOVED));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (source === LOVED) {
      setPhotos(loved);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadEventPhotos(Number(source)).then((list) => {
      if (!cancelled) {
        // Carry the heart counts over from the loved list
        const hearts = new Map(loved.map((p) => [refKey(p), p.hearts]));
        setPhotos(list.map((p) => ({ ...p, hearts: hearts.get(refKey(p)) ?? 0 })));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, source, loved, loadEventPhotos]);

  const position = (p: StudioPhotoRef) => picked.findIndex((x) => x.file_id === p.file_id && x.event_id === p.event_id);
  const toggle = (p: StudioPhoto) => {
    const ref = { file_id: p.file_id, event_id: p.event_id };
    if (mode === "single") return setPicked([ref]);
    const at = position(p);
    if (at >= 0) setPicked(picked.filter((_, i) => i !== at));
    else if (picked.length < max) setPicked([...picked, ref]);
  };
  const full = mode === "multi" && picked.length >= max;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col gap-4">
        <div>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>

        <div role="tablist" aria-label="Where to pick from" className="flex gap-1.5 overflow-x-auto pb-1">
          {loved.length > 0 && (
            <SourceTab active={source === LOVED} onClick={() => setSource(LOVED)}>
              <Heart className="h-3.5 w-3.5 fill-current" />
              Most loved
            </SourceTab>
          )}
          {events.map((e) => (
            <SourceTab key={e.event_id} active={source === String(e.event_id)} onClick={() => setSource(String(e.event_id))}>
              {e.title}
            </SourceTab>
          ))}
        </div>

        <div className="min-h-[240px] flex-1 overflow-y-auto">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading photos…
            </p>
          ) : photos.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {source === LOVED ? "No hearted photos yet. Pick from an event instead." : "This event has no ready photos yet."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
              {photos.map((p) => {
                const at = position(p);
                const on = at >= 0;
                return (
                  <li key={refKey(p)}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      disabled={!on && full}
                      aria-pressed={on}
                      aria-label={on ? "Remove photo" : "Add photo"}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-lg bg-secondary transition-[opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                        on && "ring-[3px] ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      <img src={p.thumb_url} alt="" loading="lazy" className={cn("h-full w-full object-cover", on && "scale-[0.94]")} />
                      {on && (
                        <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {mode === "multi" ? at + 1 : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      )}
                      {p.hearts > 0 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-ink-950/75 px-1.5 py-px text-[11px] font-semibold text-white">
                          ♥ {formatNumber(p.hearts)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            {mode === "multi" ? `${picked.length} of ${max} picked${full ? " · that's the most" : ""}` : picked.length ? "1 picked" : "Tap a photo"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDone(picked);
                onOpenChange(false);
              }}
              disabled={mode === "single" && picked.length === 0}
            >
              Use {mode === "multi" ? "these" : "this photo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SourceTab = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      "inline-flex max-w-[220px] shrink-0 items-center gap-1.5 truncate rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
    )}
  >
    {children}
  </button>
);
