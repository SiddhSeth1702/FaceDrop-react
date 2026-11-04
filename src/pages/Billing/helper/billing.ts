import { currentLocale, formatDate } from "@/lib/locale";
import { useCallback, useEffect, useRef, useState } from "react";
import useRequestToServer from "@/service/httpService";

export const billingUrls = {
  plans: "user/billing/plans",
  overview: "user/billing/overview",
  orders: "user/billing/orders",
  order: (orderId: string) => `user/billing/orders/${orderId}`,
  pay: (orderId: string) => `user/billing/orders/${orderId}/pay`,
  cancelStudio: "user/billing/studio/cancel",
  resumeStudio: "user/billing/studio/resume",
  reactivation: (eventId: string | number) => `user/billing/reactivation/${eventId}`,
};

export type PlanKind = "trial" | "pass" | "studio" | "reactivation";

/** What bringing an expired event back costs (Studio subscribers pay half). */
export interface ReactivationQuote {
  plan_name: string;
  gallery_days: number;
  photos: number;
  studio_discount: boolean;
  list_price_paise: number;
  amount_paise: number;
  gst_paise: number;
  total_paise: number;
}

export interface Plan {
  code: string;
  kind: PlanKind;
  name: string;
  photo_limit: number;
  price_paise: number;
  gst_paise: number;
  total_paise: number;
  gallery_days: number;
  tagline: string | null;
}

export interface StudioUsage {
  allowance: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface StudioSummary {
  subscription_id: number;
  plan: Plan;
  status: "active" | "canceled";
  cancel_at_period_end: boolean;
  period_start: string;
  period_end: string;
  usage: StudioUsage;
}

export interface PlansResponse {
  plans: Plan[];
  trial_available: boolean;
  studio: StudioSummary | null;
}

export interface Order {
  order_id: string;
  purpose: "event_pass" | "studio" | "studio_renewal" | "reactivation";
  status: "created" | "paid" | "failed";
  event_id: number | null;
  plan: Plan;
  amount_paise: number;
  gst_paise: number;
  total_paise: number;
}

/** ₹1,299 (or ₹1,299.50 when there are paise). */
export const formatRupees = (paise: number) => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString(currentLocale(), { minimumFractionDigits: rupees % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const formatCount = (n: number) => n.toLocaleString(currentLocale());

export const formatDay = (value: string) =>
  formatDate(value);

/** Fired after any payment or plan change, so the sidebar and pages refresh their balance. */
const BILLING_CHANGED = "facedrop:billing-changed";
export const notifyBillingChanged = () => window.dispatchEvent(new Event(BILLING_CHANGED));

/** Plans plus what this photographer can use right now; refetches after any billing change. */
export const usePlans = () => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await requestRef.current(billingUrls.plans, {}, "GET");
      if (response.status >= 400) throw new Error(response.data?.message);
      setData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't load plans");
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(BILLING_CHANGED, load);
    return () => window.removeEventListener(BILLING_CHANGED, load);
  }, [load]);

  return { data, error, reload: load };
};
