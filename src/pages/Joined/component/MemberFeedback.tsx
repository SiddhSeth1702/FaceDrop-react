import { FormEvent, useEffect, useState } from "react";
import { Heart, Loader2, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { joinedUrls, MyReview } from "../helper/joined";

/** A heart on a photo. Solid once hearted, so it stays visible on touch screens. */
export const HeartButton = ({ hearted, onToggle, className }: { hearted: boolean; onToggle: () => void; className?: string }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    aria-pressed={hearted}
    aria-label={hearted ? "Remove heart" : "Love this photo"}
    className={cn(
      "grid h-9 w-9 place-items-center rounded-full shadow-sm transition-[opacity,transform,background-color] active:scale-90",
      hearted ? "bg-white text-rose-500" : "bg-white/90 text-ink-950 hover:bg-white",
      className
    )}
  >
    <Heart className={cn("h-4 w-4", hearted && "fill-current")} />
  </button>
);

/**
 * Rate the photographer, in a pop-up: stars and an optional note, signed with the account name.
 * Editable until the host acts on it. The page owns the saved review (so it can label its button).
 */
export const ReviewDialog = ({
  open,
  onOpenChange,
  eventId,
  hostName,
  review,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | number;
  hostName?: string | null;
  review: MyReview | null;
  onSaved: (review: MyReview) => void;
}) => {
  const { requestToServer } = useRequestToServer();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Each time it opens, start from what they wrote before
  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Tap a star to rate.");
    setSending(true);
    setError("");
    try {
      const response = await requestToServer(joinedUrls.review(eventId), { rating, comment: comment.trim() }, "PUT");
      if (response.status >= 400) throw new Error(response.data?.message);
      onSaved(response.data.data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't send your review. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const host = hostName ?? "the photographer";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {review && !editing ? (
          <div className="py-2 text-center">
            <Stars value={review.rating} />
            <DialogTitle className="mt-3 text-xl font-bold">Thanks, {review.guest_name.split(" ")[0]}!</DialogTitle>
            <DialogDescription className="mt-1">
              {review.status === "approved" ? `${hostName ?? "The photographer"} is showing your review.` : "Your review was sent to the photographer."}
            </DialogDescription>
            {review.comment && <p className="mx-auto mt-4 max-w-md font-hand text-xl leading-snug text-primary">"{review.comment}"</p>}
            {review.status === "pending" && (
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="mb-2.5 -rotate-2 font-hand text-xl font-semibold leading-tight text-primary">loved the photos?</p>
            <DialogTitle className="text-2xl font-bold leading-tight">How did {host} do?</DialogTitle>
            <DialogDescription className="mt-1">Your review goes to the photographer, signed with your name. They decide whether to show it.</DialogDescription>

            <fieldset className="mt-5">
              <legend className="sr-only">Your rating</legend>
              <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
                    <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" aria-label={`${n} out of 5`} />
                    <Star
                      className={cn(
                        "h-9 w-9 rounded transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-ring active:scale-90",
                        n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      )}
                      strokeWidth={1.6}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-semibold" htmlFor="review-note">
              Anything you'd like to say? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea id="review-note" className="mt-1.5 min-h-[96px]" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />

            {error && (
              <p role="alert" className="mt-3 text-sm text-danger-foreground">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => (editing ? setEditing(false) : onOpenChange(false))}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="animate-spin" />}
                {sending ? "Sending..." : "Send review"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={cn("h-6 w-6", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
    ))}
  </span>
);
