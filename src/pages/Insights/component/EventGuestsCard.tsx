import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import useRequestToServer from "@/service/httpService";
import { EventInsights, formatNumber, insightsUrls } from "../helper/insights";
import { Stars } from "./Stars";

/** On the event page: how many guests scanned, what they took home, and the photos they loved. */
export const EventGuestsCard = ({ eventId }: { eventId: number | string }) => {
  const { requestToServer } = useRequestToServer();
  const [data, setData] = useState<EventInsights | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await requestToServer(insightsUrls.event(eventId), {}, "GET").catch(() => null);
      if (!cancelled && response && response.status < 400) setData(response.data.data);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, [eventId]);

  if (!data) return null;
  const { totals, top_photos } = data;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <p className="inline-block -rotate-2 font-hand text-xl font-semibold text-primary">guests so far</p>

      {totals.guests === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No one has joined yet. Share the QR, and the guests who join, download, heart and review show up here.</p>
      ) : (
        <>
          <dl className="mt-2 divide-y text-sm">
            <Row label="Guests joined" value={formatNumber(totals.guests)} />
            <Row label="Found themselves" value={formatNumber(totals.guests_found)} />
            <Row label="Photos downloaded" value={formatNumber(totals.downloads)} />
            <Row label="Hearts" value={formatNumber(totals.hearts)} />
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Reviews</dt>
              <dd>
                {totals.reviews > 0 && totals.average_rating !== null ? (
                  <Link to={`${ROUTES.reviews}?status=all&event_id=${eventId}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Stars rating={totals.average_rating} />
                    <span className="font-hand text-xl font-bold leading-none text-primary">
                      {totals.average_rating} <span className="text-base font-semibold text-muted-foreground">({totals.reviews})</span>
                    </span>
                  </Link>
                ) : (
                  <span className="font-hand text-xl font-bold leading-none text-primary">0</span>
                )}
              </dd>
            </div>
          </dl>
          {totals.reactivation_requests > 0 && (
            <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
              {totals.reactivation_requests} {totals.reactivation_requests === 1 ? "guest wants" : "guests want"} this event back
            </p>
          )}
          {totals.pending_reviews > 0 && (
            <Link to={`${ROUTES.reviews}?status=pending&event_id=${eventId}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">
              {totals.pending_reviews} new {totals.pending_reviews === 1 ? "review" : "reviews"} to read
            </Link>
          )}
        </>
      )}

      {top_photos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground">Most loved</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5">
            {top_photos.map((p) => (
              <li key={p.file_id} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                {p.thumb_url && <img src={p.thumb_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-ink-950/75 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                  <Heart className="h-2.5 w-2.5 fill-current" />
                  {p.hearts}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-hand text-xl font-bold leading-none text-primary">{value}</dd>
  </div>
);
