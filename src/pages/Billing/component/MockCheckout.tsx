import { useEffect, useState } from "react";
import { Building2, Check, CreditCard, FlaskConical, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { billingUrls, formatCount, formatRupees, notifyBillingChanged, Order } from "../helper/billing";

type Method = "upi" | "card" | "netbanking";

const METHODS: { value: Method; label: string; icon: typeof Smartphone }[] = [
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "netbanking", label: "Netbanking", icon: Building2 },
];

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"];

interface MockCheckoutProps {
  /** The order to pay; the dialog is open while this is set. */
  order: Order | null;
  onClose: () => void;
  onPaid: (order: Order) => void;
}

/**
 * Stand-in for a payment gateway's checkout. Nothing is charged: the server marks the order paid
 * (or declined, via "Simulate a failed payment"). Swapping in Razorpay replaces this component only.
 */
export const MockCheckout = ({ order, onClose, onPaid }: MockCheckoutProps) => {
  const { requestToServer } = useRequestToServer();
  const [method, setMethod] = useState<Method>("upi");
  const [upiId, setUpiId] = useState("siddh@okaxis");
  const [bank, setBank] = useState(BANKS[0]);
  const [stage, setStage] = useState<"form" | "paying" | "paid">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setStage("form");
      setError(null);
    }
  }, [order]);

  if (!order) return null;

  const pay = async (simulate: "success" | "failure" = "success") => {
    setStage("paying");
    setError(null);
    // A short pause so it feels like a real gateway round trip
    await new Promise((resolve) => setTimeout(resolve, 1100));
    try {
      const response = await requestToServer(billingUrls.pay(order.order_id), { method, simulate }, "POST");
      if (response.status >= 400) throw new Error(response.data?.message || "Payment failed");
      setStage("paid");
      notifyBillingChanged();
      const paid: Order = response.data.data;
      setTimeout(() => onPaid(paid), 900);
    } catch (err) {
      setStage("form");
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  };

  const what =
    order.purpose === "reactivation"
      ? `Reactivate your event · ${order.plan.gallery_days} more days`
      : order.purpose === "event_pass"
      ? `${order.plan.name} Event Pass · up to ${formatCount(order.plan.photo_limit)} photos`
      : `Studio ${order.plan.name} · ${formatCount(order.plan.photo_limit)} photos a month`;

  return (
    <Dialog open onOpenChange={(open) => !open && stage !== "paying" && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl p-0 sm:rounded-3xl">
        {/* Header */}
        <div className="bg-inverse px-6 pb-5 pt-6 text-inverse-foreground">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg font-bold">FaceDrop checkout</DialogTitle>
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <FlaskConical className="h-3 w-3" />
              Test mode
            </span>
          </div>
          <DialogDescription className="mt-1 text-sm text-white/60">{what}</DialogDescription>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-white/70">
              <dt>Price</dt>
              <dd className="font-mono">{formatRupees(order.amount_paise)}</dd>
            </div>
            <div className="flex justify-between text-white/70">
              <dt>GST (18%)</dt>
              <dd className="font-mono">{formatRupees(order.gst_paise)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="font-mono">{formatRupees(order.total_paise)}</dd>
            </div>
          </dl>
        </div>

        {stage === "paid" ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-lime-500 text-ink-950">
              <Check className="h-7 w-7" strokeWidth={3} />
            </span>
            <p className="mt-4 text-lg font-bold">Payment successful</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatRupees(order.total_paise)} paid. Setting things up…</p>
          </div>
        ) : (
          <div className="px-6 pb-6 pt-5">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={method === value}
                  onClick={() => setMethod(value)}
                  disabled={stage === "paying"}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition-colors",
                    method === value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {method === "upi" && (
                <label className="block text-sm">
                  <span className="font-medium">UPI ID</span>
                  <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="mt-1.5" disabled={stage === "paying"} />
                </label>
              )}
              {method === "card" && (
                <div className="space-y-2.5 text-sm">
                  <Input value="4111 1111 1111 1111" readOnly aria-label="Card number" className="font-mono" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input value="12 / 30" readOnly aria-label="Expiry" className="font-mono" />
                    <Input value="•••" readOnly aria-label="CVV" className="font-mono" />
                  </div>
                </div>
              )}
              {method === "netbanking" && (
                <label className="block text-sm">
                  <span className="font-medium">Bank</span>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    disabled={stage === "paying"}
                    className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {BANKS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {error && <p className="mt-4 rounded-xl bg-danger px-3 py-2 text-sm text-danger-foreground">{error}</p>}

            <Button size="lg" className="mt-5 w-full" onClick={() => pay("success")} disabled={stage === "paying"}>
              {stage === "paying" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {stage === "paying" ? "Processing payment…" : `Pay ${formatRupees(order.total_paise)}`}
            </Button>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>No real money is charged in test mode.</span>
              <button
                type="button"
                onClick={() => pay("failure")}
                disabled={stage === "paying"}
                className="font-semibold text-destructive hover:underline disabled:opacity-50"
              >
                Simulate a failed payment
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
