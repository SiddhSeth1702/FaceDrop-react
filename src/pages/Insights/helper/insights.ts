import { useCallback, useEffect, useRef, useState } from "react";
import useRequestToServer from "@/service/httpService";

export const insightsUrls = {
  overview: "user/insights/overview",
  event: (eventId: string | number) => `user/insights/events/${eventId}`,
  reviews: "user/insights/reviews",
  review: (reviewId: number) => `user/insights/reviews/${reviewId}`,
};

export interface Totals {
  /** Members who joined. */
  guests: number;
  /** Members matched in at least one photo. */
  guests_found: number;
  downloads: number;
  hearts: number;
  reviews: number;
  pending_reviews: number;
  average_rating: number | null;
  /** Members asking for an expired event back. */
  reactivation_requests: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export type ReviewStatus = "pending" | "approved" | "hidden";

export interface Review {
  review_id: number;
  event_id: number | null;
  event_title: string;
  guest_name: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
}

export interface EventRow {
  event_id: number;
  title: string;
  cover_url: string | null;
  event_date: string;
  status: number;
  guests: number;
  downloads: number;
  hearts: number;
  reviews: number;
  average_rating: number | null;
}

export interface Overview {
  totals: Totals;
  joins_by_day: DayCount[];
  events: EventRow[];
  recent_reviews: Review[];
}

export interface EventInsights {
  totals: Totals;
  joins_by_day: DayCount[];
  top_photos: { file_id: number; hearts: number; thumb_url: string | null }[];
}

const REVIEWS_CHANGED = "facedrop:reviews-changed";
export const notifyReviewsChanged = () => window.dispatchEvent(new Event(REVIEWS_CHANGED));

/** Reviews waiting for the photographer, for the sidebar badge. Refreshes after any moderation. */
export const usePendingReviewCount = () => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await requestRef.current(`${insightsUrls.reviews}?status=pending&limit=1`, {}, "GET");
      if (response.status < 400) setCount(response.data.data.counts?.pending ?? 0);
    } catch {
      // The badge is a nicety; leave it as it was
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(REVIEWS_CHANGED, load);
    return () => window.removeEventListener(REVIEWS_CHANGED, load);
  }, [load]);

  return count;
};

/** Missing numbers (e.g. an older API) show as 0 instead of crashing the page. */
export { formatNumber } from "@/lib/locale";

