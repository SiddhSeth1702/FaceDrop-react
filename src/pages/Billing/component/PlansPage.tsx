import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Gift, Loader2, Sparkles, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { billingUrls, formatCount, formatDay, formatRupees, Order, Plan, usePlans } from "../helper/billing";
import { MockCheckout } from "./MockCheckout";

/** All plans in one place: Studio subscriptions to buy or switch, Event Passes and the free trial. */
const PlansPage = () => {
  const { data, error } = usePlans();
  const { requestToServer } = useRequestToServer();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [startingCode, setStartingCode] = useState<string | null>(null);

  const studioPlans = data?.plans.filter((p) => p.kind === "studio") ?? [];
  const passes = data?.plans.filter((p) => p.kind === "pass") ?? [];
  const trial = data?.plans.find((p) => p.kind === "trial");
  const current = data?.studio ?? null;

  const choose = async (plan: Plan) => {
    setStartingCode(plan.code);
    try {
      const response = await requestToServer(billingUrls.orders, { planCode: plan.code }, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      setOrder(response.data.data);
    } catch (err) {
      toast({ title: "Couldn't start the checkout", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setStartingCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Plans</h1>
        <p className="-rotate-2 font-hand text-xl font-semibold text-primary">pay per event, or monthly</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Prices exclude 18% GST. You always see the total before paying.</p>

      {error && <p className="mt-6 rounded-xl bg-danger px-4 py-3 text-sm text-danger-foreground">{error}</p>}

      {!data ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-secondary" />
          ))}
        </div>
      ) : (
        <>
          {/* Studio */}
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Studio plans
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  A monthly photo allowance for all your events. Unused photos don't carry over. Cancel anytime.
                </p>
              </div>
              {current && (
                <Link to={ROUTES.billing} className="text-sm font-semibold text-primary hover:underline">
                  You're on Studio {current.plan.name} · {current.cancel_at_period_end ? "ends" : "renews"} {formatDay(current.period_end)}
                </Link>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {studioPlans.map((plan) => {
                const isCurrent = current?.plan.code === plan.code;
                const isUpgrade = current && plan.photo_limit > current.plan.photo_limit;
                return (
                  <div
                    key={plan.code}
                    className={cn(
                      "relative flex flex-col rounded-3xl border bg-card p-6",
                      isCurrent ? "border-primary shadow-lift" : plan.code === "studio_growth" && !current && "border-primary/50"
                    )}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 right-5 rounded-full bg-lime-500 px-2.5 py-0.5 text-xs font-bold text-ink-950">Current plan</span>
                    )}
                    <p className="text-sm font-semibold text-muted-foreground">Studio</p>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-4xl font-extrabold">{formatRupees(plan.price_paise)}</span>
                      <span className="text-sm text-muted-foreground">/ month</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRupees(plan.total_paise)} with GST</p>
                    <ul className="mt-5 flex-1 space-y-2 text-sm">
                      <Point>{formatCount(plan.photo_limit)} photos every month</Point>
                      <Point>Unlimited events and guests</Point>
                      <Point>Each gallery live for {plan.gallery_days} days</Point>
                    </ul>
                    {plan.tagline && <p className="mt-4 font-hand text-lg font-semibold text-primary">{plan.tagline}</p>}
                    <Button
                      className="mt-4 w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || startingCode !== null}
                      onClick={() => choose(plan)}
                    >
                      {startingCode === plan.code && <Loader2 className="animate-spin" />}
                      {isCurrent ? "Your plan" : current ? (isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`) : `Choose ${plan.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
            {current && (
              <p className="mt-3 text-xs text-muted-foreground">Switching plans starts a fresh month on the new plan right away.</p>
            )}
          </section>

          {/* Event Pass */}
          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Ticket className="h-5 w-5 text-primary" />
              Event Pass
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pay once for one event. You pick the size when you create the event, and pay before uploading.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {passes.map((pass) => (
                <div key={pass.code} className="rounded-2xl border bg-card p-5">
                  <p className="font-display text-lg font-bold">{pass.name}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold">{formatRupees(pass.price_paise)}</p>
                  <p className="text-xs text-muted-foreground">
                    per event · {formatCount(pass.photo_limit)} photos · {pass.gallery_days} days
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                    <Link to={`${ROUTES.createEvent}?plan=${pass.code}`}>Create a {pass.name.toLowerCase()} event</Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Trial */}
          {trial && (
            <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-primary/40 bg-accent/50 p-6">
              <div className="flex items-start gap-3">
                <Gift className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Free trial</p>
                  <p className="text-sm text-muted-foreground">
                    {data.trial_available
                      ? `One event, up to ${formatCount(trial.photo_limit)} photos, live for ${trial.gallery_days} days. No payment needed.`
                      : "You've used your free trial."}
                  </p>
                </div>
              </div>
              {data.trial_available && (
                <Button onClick={() => navigate(ROUTES.createEvent)}>Use it on a new event</Button>
              )}
            </section>
          )}
        </>
      )}

      <MockCheckout
        order={order}
        onClose={() => setOrder(null)}
        onPaid={(paid) => {
          setOrder(null);
          toast({ title: `You're on Studio ${paid.plan.name}`, description: `${formatCount(paid.plan.photo_limit)} photos a month, starting now.` });
          navigate(ROUTES.billing);
        }}
      />
    </div>
  );
};

const Point = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2">
    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.6} />
    {children}
  </li>
);

export default PlansPage;
