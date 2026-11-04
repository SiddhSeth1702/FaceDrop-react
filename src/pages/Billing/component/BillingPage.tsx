import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { billingUrls, formatCount, formatDay, formatRupees, notifyBillingChanged, StudioSummary } from "../helper/billing";

interface BillingOrder {
  order_id: string;
  purpose: "event_pass" | "studio" | "studio_renewal" | "reactivation";
  plan_name: string;
  event_id: number | null;
  event_title: string | null;
  amount_paise: number;
  gst_paise: number;
  total_paise: number;
  status: "created" | "paid" | "failed";
  method: string | null;
  provider: string;
  paid_at: string | null;
  created_at: string;
}

interface Overview {
  studio: StudioSummary | null;
  trial_available: boolean;
  orders: BillingOrder[];
}

const ORDER_STATUS = {
  paid: { label: "Paid", className: "bg-live text-live-foreground" },
  created: { label: "Not paid", className: "bg-secondary text-muted-foreground" },
  failed: { label: "Failed", className: "bg-danger text-danger-foreground" },
};

const describeOrder = (order: BillingOrder) =>
  order.purpose === "reactivation"
    ? "Event reactivation · 30 more days"
    : order.purpose === "event_pass"
    ? `${order.plan_name} Event Pass`
    : order.purpose === "studio_renewal"
      ? `Studio ${order.plan_name} · monthly renewal`
      : `Studio ${order.plan_name}`;

/** The current Studio plan (usage, renewal) and every payment made. */
const BillingPage = () => {
  const { requestToServer } = useRequestToServer();
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await requestToServer(billingUrls.overview, {}, "GET");
    if (response.status < 400) setData(response.data.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRenewal = async () => {
    if (!data?.studio) return;
    setBusy(true);
    try {
      const url = data.studio.cancel_at_period_end ? billingUrls.resumeStudio : billingUrls.cancelStudio;
      const response = await requestToServer(url, {}, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      toast({
        title: data.studio.cancel_at_period_end ? "Your plan will renew" : "Renewal cancelled",
        description: data.studio.cancel_at_period_end
          ? `Studio ${data.studio.plan.name} renews on ${formatDay(data.studio.period_end)}.`
          : `You can keep using it until ${formatDay(data.studio.period_end)}.`,
      });
      notifyBillingChanged();
      await load();
    } catch (err) {
      toast({ title: "Something went wrong", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const studio = data?.studio;

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Billing</h1>
        <p className="-rotate-2 font-hand text-xl font-semibold text-primary">no surprises</p>
      </div>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <FlaskConical className="h-4 w-4" />
        Payments are in test mode: nothing is actually charged.
      </p>

      {!data ? (
        <div className="mt-8 h-48 animate-pulse rounded-3xl bg-secondary" />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Current plan */}
          <section className="h-fit rounded-3xl bg-inverse p-6 text-inverse-foreground">
            {studio ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm text-white/60">
                      <Sparkles className="h-4 w-4 text-lime-500" />
                      Studio plan
                    </p>
                    <p className="mt-1 font-display text-3xl font-bold">{studio.plan.name}</p>
                  </div>
                  <p className="text-right font-mono text-sm text-white/70">
                    {formatRupees(studio.plan.price_paise)}
                    <span className="block text-xs text-white/50">/ month + GST</span>
                  </p>
                </div>

                <Usage studio={studio} />

                <p className="mt-5 text-sm text-white/70">
                  {studio.cancel_at_period_end
                    ? `Ends on ${formatDay(studio.period_end)}. It won't renew.`
                    : `Renews on ${formatDay(studio.period_end)} with a fresh ${formatCount(studio.plan.photo_limit)} photos.`}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="signal" size="sm">
                    <Link to={ROUTES.plans}>Change plan</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleRenewal}
                    disabled={busy}
                    className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    {studio.cancel_at_period_end ? "Keep renewing" : "Cancel renewal"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/60">Your plan</p>
                <p className="mt-1 font-display text-3xl font-bold">Pay per event</p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  You pick an Event Pass each time you create an event.
                  {data.trial_available && " Your free trial (200 photos) is still available."}
                </p>
                <p className="mt-3 text-sm text-white/70">Shooting every weekend? A Studio plan gives you a monthly allowance for all events.</p>
                <Button asChild variant="signal" size="sm" className="mt-5">
                  <Link to={ROUTES.plans}>See Studio plans</Link>
                </Button>
              </>
            )}
          </section>

          {/* Payments */}
          <section className="rounded-3xl border bg-card">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Payments</h2>
            </div>
            {data.orders.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="divide-y">
                {data.orders.map((order) => {
                  const status = ORDER_STATUS[order.status];
                  return (
                    <li key={order.order_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{describeOrder(order)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDay(order.paid_at || order.created_at)}
                          {order.event_id && order.event_title && (
                            <>
                              {" · "}
                              <Link to={ROUTES.event(order.event_id)} className="hover:text-foreground hover:underline">
                                {order.event_title}
                              </Link>
                            </>
                          )}
                          {order.method && ` · ${order.method.toUpperCase()}`}
                        </p>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span>
                      <p className="w-24 text-right font-mono text-sm" title={`${formatRupees(order.amount_paise)} + ${formatRupees(order.gst_paise)} GST`}>
                        {formatRupees(order.total_paise)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const Usage = ({ studio }: { studio: StudioSummary }) => {
  const { allowance, used, pending, remaining } = studio.usage;
  const usedPercent = allowance ? Math.min(100, (used / allowance) * 100) : 0;
  const pendingPercent = allowance ? Math.min(100 - usedPercent, (pending / allowance) * 100) : 0;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">This month</span>
        <span className="font-mono text-white/70">
          {formatCount(used)} / {formatCount(allowance)} photos
        </span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-lime-500" style={{ width: `${usedPercent}%` }} />
        <div className="h-full bg-lime-500/40" style={{ width: `${pendingPercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/60">
        {formatCount(remaining)} left
        {pending > 0 && ` · ${formatCount(pending)} still uploading or processing`}
      </p>
    </div>
  );
};

export default BillingPage;
