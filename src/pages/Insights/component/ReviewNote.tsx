import { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDay } from "@/pages/Billing/helper/billing";
import { Review } from "../helper/insights";

/** Paper notes in a few soft colours; they stay paper-coloured in dark mode too. */
const NOTE_COLOURS = ["hsl(48 90% 88%)", "hsl(200 75% 91%)", "hsl(340 80% 92%)", "hsl(140 45% 89%)"];

const STATUS_MARK = {
  pending: { text: "new!", className: "text-primary" },
  approved: { text: "on your page ✓", className: "text-emerald-700" },
  hidden: { text: "hidden", className: "text-ink-950/50" },
};

/** A guest review as a taped paper note. Pass actions to show buttons along the bottom. */
export const ReviewNote = ({
  review: r,
  index,
  showStatus,
  actions,
  className,
}: {
  review: Review;
  index: number;
  /** Mark every status, not just new ones. */
  showStatus?: boolean;
  actions?: ReactNode;
  className?: string;
}) => {
  const mark = STATUS_MARK[r.status];
  const showMark = showStatus || r.status === "pending";
  return (
    <li
      className={cn(
        "relative flex flex-col px-5 pb-4 pt-6 text-ink-950 shadow-[0_1px_1px_hsl(0_0%_0%/0.08),0_14px_26px_-14px_hsl(0_0%_0%/0.45)] transition-[opacity,filter]",
        index % 2 ? "rotate-[1.2deg]" : "-rotate-[1deg]",
        r.status === "hidden" && showStatus && "opacity-60 grayscale",
        className
      )}
      style={{ background: NOTE_COLOURS[index % NOTE_COLOURS.length] }}
    >
      <span className="tape !w-16" />
      {showMark && <span className={cn("absolute right-3 top-2 rotate-6 font-hand text-lg font-bold", mark.className)}>{mark.text}</span>}
      <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn("h-3.5 w-3.5", n <= r.rating ? "fill-amber-500 text-amber-500" : "text-ink-950/20")} />
        ))}
      </span>
      <p className="mt-2 font-hand text-[22px] font-semibold leading-[1.15]">{r.comment ? `"${r.comment}"` : "no words, just stars"}</p>
      <p className="mt-3 font-hand text-lg leading-none">— {r.guest_name}</p>
      <p className="mt-1 truncate text-xs text-ink-950/60">
        {r.event_title} · {formatDay(r.created_at)}
      </p>
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-ink-950/20 pt-3">{actions}</div>}
    </li>
  );
};
