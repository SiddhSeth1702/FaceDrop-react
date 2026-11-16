import { useCallback, useEffect, useRef, useState } from "react";
import useRequestToServer from "@/service/httpService";
import { eventPhotosUrl } from "@/service/requestUrls.service";
import { EventRow, insightsUrls, Overview, Review, Totals } from "@/pages/Insights/helper/insights";
import { refKey, StudioPhotoRef } from "./studio";

/** A photo the photographer can put on their page. */
export interface StudioPhoto extends StudioPhotoRef {
  thumb_url: string;
  hearts: number;
}

/** The real data a Studio page is built from: all of it comes from existing endpoints. */
export interface StudioSource {
  loading: boolean;
  error: string | null;
  totals: Totals | null;
  /** Events that went live (or have since expired), newest first. */
  events: EventRow[];
  /** Approved reviews only: nothing else can appear publicly. */
  reviews: Review[];
  /** The most-hearted photos across events, most loved first. */
  loved: StudioPhoto[];
  /** URL for any photo loaded so far. */
  urlFor: (ref: StudioPhotoRef | null | undefined) => string | null;
  /** All ready photos of one event (loaded on demand, then cached). */
  loadEventPhotos: (eventId: number) => Promise<StudioPhoto[]>;
}

const LIVE = 1;
const EXPIRED = 4;
/** Look for loved photos in this many recent events. */
const LOVED_EVENTS = 10;

export const useStudioSource = (): StudioSource => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loved, setLoved] = useState<StudioPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const eventPhotoCache = useRef<Record<number, Promise<StudioPhoto[]>>>({});

  const remember = (photos: StudioPhoto[]) =>
    setUrls((prev) => {
      const next = { ...prev };
      for (const p of photos) next[refKey(p)] = p.thumb_url;
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overviewRes, reviewsRes] = await Promise.all([
          requestRef.current(insightsUrls.overview, {}, "GET"),
          requestRef.current(`${insightsUrls.reviews}?status=approved&limit=100`, {}, "GET"),
        ]);
        if (overviewRes.status >= 400) throw new Error(overviewRes.data?.message);
        const overview: Overview = overviewRes.data.data;
        const delivered = overview.events.filter((e) => e.status === LIVE || e.status === EXPIRED);

        // The photos guests hearted most, from the recent events that have any hearts
        const withHearts = delivered.filter((e) => e.hearts > 0).slice(0, LOVED_EVENTS);
        const perEvent = await Promise.all(
          withHearts.map(async (e) => {
            const res = await requestRef.current(insightsUrls.event(e.event_id), {}, "GET").catch(() => null);
            const top: { file_id: number; hearts: number; thumb_url: string | null }[] = res && res.status < 400 ? res.data.data.top_photos : [];
            return top.filter((p) => p.thumb_url).map((p) => ({ file_id: p.file_id, event_id: e.event_id, hearts: p.hearts, thumb_url: p.thumb_url! }));
          })
        );
        const lovedPhotos = perEvent.flat().sort((a, b) => b.hearts - a.hearts);

        if (cancelled) return;
        setTotals(overview.totals);
        setEvents(delivered);
        setReviews(reviewsRes.status < 400 ? reviewsRes.data.data.result : []);
        setLoved(lovedPhotos);
        remember(lovedPhotos);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error && err.message ? err.message : "Couldn't load your events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEventPhotos = useCallback((eventId: number) => {
    eventPhotoCache.current[eventId] ??= (async () => {
      const res = await requestRef.current(`${eventPhotosUrl(eventId)}?status=ready&limit=200`, {}, "GET").catch(() => null);
      const items: { file_id: number; thumb_url: string | null }[] = res && res.status < 400 ? res.data.data.result : [];
      const photos = items.filter((p) => p.thumb_url).map((p) => ({ file_id: p.file_id, event_id: eventId, hearts: 0, thumb_url: p.thumb_url! }));
      remember(photos);
      return photos;
    })();
    return eventPhotoCache.current[eventId];
  }, []);

  const urlFor = useCallback((ref: StudioPhotoRef | null | undefined) => (ref ? (urls[refKey(ref)] ?? null) : null), [urls]);

  return { loading, error, totals, events, reviews, loved, urlFor, loadEventPhotos };
};
