import { Check, Gift, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { formatCount, formatRupees, PlansResponse } from "../helper/billing";

interface PlanPickerProps {
  data: PlansResponse;
  value: string;
  onChange: (code: string) => void;
}

/** The plan an event should go live on: free trial, the Studio allowance, or an Event Pass size. */
export const defaultPlanCode = (data: PlansResponse) =>
  data.studio && data.studio.usage.remaining > 0 ? "studio" : data.trial_available ? "trial" : "pass_medium";

export const PlanPicker = ({ data, value, onChange }: PlanPickerProps) => {
  const passes = data.plans.filter((p) => p.kind === "pass");
  const trial = data.plans.find((p) => p.kind === "trial");
  const studio = data.studio;

  return (
    <div role="radiogroup" aria-label="How this event goes live" className="space-y-2.5">
      {studio && (
        <Option
          selected={value === "studio"}
          disabled={studio.usage.remaining <= 0}
          onSelect={() => onChange("studio")}
          icon={<Sparkles className="h-4 w-4" />}
          title={`Studio ${studio.plan.name}`}
          detail={
            studio.usage.remaining > 0
              ? `Uses your monthly allowance · ${formatCount(studio.usage.remaining)} photos left`
              : "This month's allowance is used up"
          }
          price="Included"
        />
      )}

      {trial && data.trial_available && (
        <Option
          selected={value === "trial"}
          onSelect={() => onChange("trial")}
          icon={<Gift className="h-4 w-4" />}
          title="Free trial"
          detail={`Up to ${formatCount(trial.photo_limit)} photos · live for ${trial.gallery_days} days · once per account`}
          price="₹0"
        />
      )}

      <div className="grid gap-2.5 sm:grid-cols-3">
        {passes.map((pass) => (
          <button
            key={pass.code}
            type="button"
            role="radio"
            aria-checked={value === pass.code}
            onClick={() => onChange(pass.code)}
            className={cn(
              "relative rounded-2xl border p-4 text-left transition-colors",
              value === pass.code ? "border-primary bg-accent/60 ring-1 ring-primary" : "hover:bg-secondary/60"
            )}
          >
            {value === pass.code && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <p className="text-xs font-semibold text-muted-foreground">Event Pass</p>
            <p className="mt-0.5 font-display text-lg font-bold">{pass.name}</p>
            <p className="mt-2 font-display text-2xl font-extrabold leading-none">{formatRupees(pass.price_paise)}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">+ GST · {formatCount(pass.photo_limit)} photos · {pass.gallery_days} days</p>
            {pass.tagline && <p className="mt-2 font-hand text-[15px] font-semibold leading-tight text-primary">{pass.tagline}</p>}
          </button>
        ))}
      </div>

      {!studio && (
        <p className="text-[13px] text-muted-foreground">
          Shooting every weekend?{" "}
          <Link to={ROUTES.plans} className="font-semibold text-primary hover:underline">
            Studio plans
          </Link>{" "}
          give you a monthly photo allowance across all your events.
        </p>
      )}
    </div>
  );
};

const Option = ({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  detail,
  price,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  detail: string;
  price: string;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      "flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      selected ? "border-primary bg-accent/60 ring-1 ring-primary" : "hover:bg-secondary/60"
    )}
  >
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold">{title}</span>
      <span className="block text-[13px] text-muted-foreground">{detail}</span>
    </span>
    <span className="shrink-0 font-display text-lg font-bold">{price}</span>
  </button>
);
