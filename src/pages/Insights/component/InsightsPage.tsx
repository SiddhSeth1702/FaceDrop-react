import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PenCircled, Scribbled } from "@/components/brand/Doodles";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { formatDay } from "@/pages/Billing/helper/billing";
import { EventRow, formatNumber, insightsUrls, Overview, Totals } from "../helper/insights";
import { ReviewNote } from "./ReviewNote";
import { DayChart } from "./DayChart";

/** What guests did across all events: who joined, what they took home, hearts and reviews. */
const InsightsPage = () => {
  const { requestToServer } = useRequestToServer();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await requestToServer(insightsUrls.overview, {}, "GET");
        if (response.status >= 400) throw new Error(response.data?.message);
        setData(response.data.data);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Couldn't load insights");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, []);

  const totals = data?.totals;
  const activeEvents = data?.events.filter((e) => e.guests > 0 || e.reviews > 0) ?? [];

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Insights</h1>
        <p className="-rotate-2 font-hand text-xl font-semibold text-primary">what your guests got up to</p>
      </div>

      {error && <p className="mt-6 rounded-xl bg-danger px-4 py-3 text-sm text-danger-foreground">{error}</p>}

      {!data || !totals ? (
        !error && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="h-56 animate-pulse rounded-3xl bg-secondary" />
            <div className="h-56 animate-pulse rounded-3xl bg-secondary" />
          </div>
        )
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-start">
            <Headline totals={totals} />

            <section className="rounded-3xl border bg-card p-6">
              <h2 className="font-semibold">
                Guests joining <span className="ml-1 font-hand text-lg font-semibold text-muted-foreground">· last 30 days</span>
              </h2>
              <div className="mt-2">
                {totals.guests === 0 ? (
                  <p className="py-12 text-center font-hand text-xl text-muted-foreground">nothing to draw yet…</p>
                ) : (
                  <DayChart days={data.joins_by_day} unit={["guest joined", "guests joined"]} caption="Guests joining per day" />
                )}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="font-semibold">Event by event</h2>
              {activeEvents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Events show up here once a guest joins.</p>
              ) : (
                <ul className="mt-2 divide-y divide-dashed">
                  {activeEvents.map((e, i) => (
                    <EventLine key={e.event_id} event={e} index={i} />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="font-semibold">What guests said</h2>
                <Link to={ROUTES.reviews} className="text-sm font-semibold text-primary hover:underline">
                  All reviews
                </Link>
              </div>
              {data.recent_reviews.length === 0 ? (
                <p className="mt-3 rounded-3xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                  Guests can rate you right after they find their photos.
                </p>
              ) : (
                <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {data.recent_reviews.map((r, i) => (
                    <ReviewNote key={r.review_id} review={r} index={i} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

/** A big handwritten number with a pen circle around it. */
const Num = ({ n }: { n: number }) => (
  <span className="mx-[0.2em] inline-block">
    <PenCircled className="text-primary/60">
      {/* A minimum width keeps single digits from getting a squeezed, zero-like circle */}
      <span className="inline-block min-w-[1.3em] text-center font-hand text-[1.55em] font-bold leading-none text-primary">{formatNumber(n)}</span>
    </PenCircled>
  </span>
);

/** A little margin note that reacts to the numbers. */
const quip = (t: Totals) => {
  if (t.average_rating !== null && t.average_rating >= 4.5) return "they love you ♥";
  if (t.guests_found > 0 && t.downloads === 0) return "psst… nobody's hit download yet";
  if (t.reactivation_requests > 0) return `${t.reactivation_requests} want an event back!`;
  if (t.guests >= 100) return "busy season, huh?";
  if (t.hearts > t.guests) return "lots of hearts going round";
  return "it's a start!";
};

const Headline = ({ totals }: { totals: Totals }) => (
  <section
    className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8"
    // Faint ruled lines, like a page from a notebook
    style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 39px, hsl(var(--border) / 0.7) 39px 40px)" }}
  >
    {totals.guests === 0 ? (
      <>
        <p className="text-[22px] font-medium leading-[40px]">
          No guest has joined yet. <Scribbled>Put the QR</Scribbled> on the welcome board or the family WhatsApp group.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Every guest who joins, downloads, hearts or reviews shows up here.</p>
        <Button asChild size="sm" className="mt-5">
          <Link to={ROUTES.dashboard}>Go to your events</Link>
        </Button>
      </>
    ) : (
      <>
        <p className="absolute right-5 top-4 hidden rotate-3 font-hand text-xl font-semibold text-primary sm:block">{quip(totals)}</p>
        <p className="max-w-[34ch] text-[22px] sm:pt-4 font-medium leading-[40px] sm:text-[24px]">
          <Num n={totals.guests} /> {totals.guests === 1 ? "guest" : "guests"} joined
          {/* Zeros read better as words than as a circled 0 */}
          {totals.guests_found > 0 ? (
            <>
              , <Num n={totals.guests_found} /> found themselves
            </>
          ) : (
            ", nobody's added a selfie yet"
          )}
          {totals.downloads > 0 ? (
            <>
              {" "}and they took home <Num n={totals.downloads} /> {totals.downloads === 1 ? "photo" : "photos"}.
            </>
          ) : (
            " and no photos have been downloaded yet."
          )}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            {formatNumber(totals.hearts)} {totals.hearts === 1 ? "heart" : "hearts"}
          </span>
          {totals.reviews > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {totals.average_rating} from {formatNumber(totals.reviews)} {totals.reviews === 1 ? "review" : "reviews"}
            </span>
          )}
        </p>
        {totals.pending_reviews > 0 && (
          <Button asChild size="sm" className="mt-5">
            <Link to={`${ROUTES.reviews}?status=pending`}>
              Read {totals.pending_reviews} new {totals.pending_reviews === 1 ? "review" : "reviews"}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </>
    )}
  </section>
);

const EventLine = ({ event: e, index }: { event: EventRow; index: number }) => (
  <li className="flex items-center gap-4 py-3.5">
    <Link to={ROUTES.event(e.event_id)} className={cn("polaroid shrink-0 !px-1.5 !pt-1.5 pb-3.5", index % 2 ? "rotate-2" : "-rotate-2")} aria-hidden="true" tabIndex={-1}>
      <span className={cn("block h-11 w-14 overflow-hidden rounded-[2px]", !e.cover_url && `film film-${(e.event_id % 6) + 1}`)}>
        {e.cover_url && <img src={e.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </span>
    </Link>
    <div className="min-w-0 flex-1">
      <Link to={ROUTES.event(e.event_id)} className="block truncate font-semibold hover:underline">
        {e.title}
      </Link>
      <p className="text-xs text-muted-foreground">{formatDay(e.event_date)}</p>
      <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        <span>
          <b className="font-semibold text-foreground">{formatNumber(e.guests)}</b> {e.guests === 1 ? "guest" : "guests"}
        </span>
        <span>
          <b className="font-semibold text-foreground">{formatNumber(e.downloads)}</b> {e.downloads === 1 ? "download" : "downloads"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          <b className="font-semibold text-foreground">{formatNumber(e.hearts)}</b>
        </span>
        {e.average_rating !== null && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <b className="font-semibold text-foreground">{e.average_rating}</b>
          </span>
        )}
      </p>
    </div>
  </li>
);

export default InsightsPage;
