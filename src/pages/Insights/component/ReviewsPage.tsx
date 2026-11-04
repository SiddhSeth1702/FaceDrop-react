import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, EyeOff, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { formatDay } from "@/pages/Billing/helper/billing";
import { insightsUrls, notifyReviewsChanged, Review, ReviewStatus } from "../helper/insights";
import { ReviewNote } from "./ReviewNote";

type Tab = "all" | ReviewStatus;
const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "New" },
  { value: "approved", label: "Approved" },
  { value: "hidden", label: "Hidden" },
  { value: "all", label: "All" },
];
const PAGE_SIZE = 20;

/** Guest reviews: approve the ones you're happy to show (they become testimonials), hide the rest. */
const ReviewsPage = () => {
  const { requestToServer } = useRequestToServer();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("status") as Tab) || "pending";
  const eventId = params.get("event_id");

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [counts, setCounts] = useState<Record<Tab, number>>({ all: 0, pending: 0, approved: 0, hidden: 0 });
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (page = 1) => {
      const query = new URLSearchParams({ status: tab, page: String(page), limit: String(PAGE_SIZE) });
      if (eventId) query.set("event_id", eventId);
      const response = await requestToServer(`${insightsUrls.reviews}?${query}`, {}, "GET");
      if (response.status >= 400) return;
      const { result, pagination, counts } = response.data.data;
      setReviews((prev) => (page === 1 ? result : [...(prev ?? []), ...result]));
      setCounts(counts);
      setNextPage(pagination?.next ?? null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
    [tab, eventId]
  );

  useEffect(() => {
    setReviews(null);
    void load(1);
  }, [load]);

  const setStatus = async (review: Review, status: ReviewStatus) => {
    setBusyId(review.review_id);
    try {
      const response = await requestToServer(insightsUrls.review(review.review_id), { status }, "PATCH");
      if (response.status >= 400) throw new Error(response.data?.message);
      // Leaves this tab unless we're looking at all of them
      setReviews((prev) =>
        (prev ?? []).flatMap((r) => (r.review_id !== review.review_id ? [r] : tab === "all" ? [{ ...r, status }] : []))
      );
      setCounts((prev) => ({ ...prev, [review.status]: prev[review.status] - 1, [status]: prev[status] + 1 }));
      notifyReviewsChanged();
      toast({
        title: status === "approved" ? "Approved" : status === "hidden" ? "Hidden" : "Moved back to new",
        description:
          status === "approved" ? `${review.guest_name}'s review can now appear on your portfolio.` : status === "hidden" ? "Only you can see it now." : undefined,
      });
    } catch (err) {
      toast({ title: "Couldn't update the review", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const selectTab = (value: Tab) => {
    const next = new URLSearchParams(params);
    next.set("status", value);
    setParams(next, { replace: true });
  };

  const eventTitle = eventId ? reviews?.find((r) => String(r.event_id) === eventId)?.event_title : null;

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Reviews</h1>
        <p className="-rotate-2 font-hand text-xl font-semibold text-primary">straight from the guests</p>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Guests can rate you after they find their photos. Nothing is public until you approve it.
      </p>

      {eventId && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm">
          Only {eventTitle ? <span className="font-semibold">{eventTitle}</span> : "one event"}
          <Link
            to={`${ROUTES.reviews}?status=${tab}`}
            aria-label="Show reviews from all events"
            className="grid h-6 w-6 place-items-center rounded-full hover:bg-background"
          >
            <X className="h-3.5 w-3.5" />
          </Link>
        </p>
      )}

      <div role="tablist" aria-label="Review status" className="mt-5 flex flex-wrap gap-1.5">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => selectTab(value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === value ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className="ml-1.5 font-hand text-base font-bold leading-none">{counts[value]}</span>
          </button>
        ))}
      </div>

      {!reviews ? (
        <div className="mt-8 columns-1 gap-7 sm:columns-2 2xl:columns-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("mb-7 h-44 animate-pulse break-inside-avoid bg-secondary", i % 2 ? "rotate-1" : "-rotate-1")} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="inline-block -rotate-2 font-hand text-3xl font-semibold text-primary">
            {tab === "pending" ? "all caught up!" : "nothing here yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "pending" ? "New reviews land here first." : "Reviews you move here will show up in this list."}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-8 columns-1 gap-7 sm:columns-2 2xl:columns-3">
            {reviews.map((r, i) => (
              <ReviewNote
                key={r.review_id}
                review={r}
                index={i}
                showStatus={tab === "all"}
                className="mb-7 break-inside-avoid"
                actions={
                  <>
                    {r.status !== "approved" && (
                      <NoteButton primary onClick={() => setStatus(r, "approved")} disabled={busyId !== null}>
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </NoteButton>
                    )}
                    {r.status !== "hidden" && (
                      <NoteButton onClick={() => setStatus(r, "hidden")} disabled={busyId !== null}>
                        <EyeOff className="h-3.5 w-3.5" />
                        Hide
                      </NoteButton>
                    )}
                    {r.status !== "pending" && (
                      <NoteButton onClick={() => setStatus(r, "pending")} disabled={busyId !== null}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Undo
                      </NoteButton>
                    )}
                    {busyId === r.review_id && <Loader2 className="h-4 w-4 animate-spin text-ink-950/60" />}
                    {r.event_id && (
                      <Link to={ROUTES.event(r.event_id)} className="ml-auto text-xs font-semibold text-ink-950/60 hover:text-ink-950 hover:underline">
                        Open event
                      </Link>
                    )}
                  </>
                }
              />
            ))}
          </ul>

          {nextPage && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={async () => {
                  setLoadingMore(true);
                  await load(nextPage);
                  setLoadingMore(false);
                }}
              >
                {loadingMore && <Loader2 className="animate-spin" />}
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Buttons that sit on a paper note, so they stay ink-on-paper in dark mode too. */
const NoteButton = ({ primary, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) => (
  <button
    type="button"
    {...props}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950 disabled:opacity-50",
      primary ? "bg-ink-950 text-white hover:bg-ink-800" : "border border-ink-950/25 text-ink-950 hover:bg-ink-950/5"
    )}
  >
    {children}
  </button>
);

export default ReviewsPage;
