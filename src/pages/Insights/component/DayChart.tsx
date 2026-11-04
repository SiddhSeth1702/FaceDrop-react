import { useState } from "react";
import { HandArrow } from "@/components/brand/Doodles";
import { cn } from "@/lib/utils";
import { DayCount, formatNumber } from "../helper/insights";

const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

/** Room above the bars for the handwritten note on the busiest day. */
const NOTE_SPACE = 52;

/**
 * A count per day, drawn like a sketch in a notebook: a pen baseline, a dot for quiet days,
 * and a handwritten note on the busiest one. Hover or focus a bar for its count; a table is there for screen readers.
 */
export const DayChart = ({
  days,
  unit,
  caption,
  height = 150,
}: {
  days: DayCount[];
  /** Singular and plural, e.g. ["guest joined", "guests joined"]. */
  unit: [string, string];
  caption: string;
  height?: number;
}) => {
  const label = (n: number) => `${formatNumber(n)} ${n === 1 ? unit[0] : unit[1]}`;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.count));
  const peak = max > 0 ? days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0) : -1;
  const peakLeft = ((peak + 0.5) / days.length) * 100;
  // Keep the note inside the card: it reads to the left of the arrow near the right edge
  const flip = peakLeft > 62;
  const hovered = active === null ? null : days[active];

  return (
    <figure className="relative">
      <div className="relative" style={{ paddingTop: NOTE_SPACE }}>
        {peak >= 0 && (
          <div
            className={cn("pointer-events-none absolute top-0 flex items-end gap-1 text-primary", flip ? "flex-row-reverse" : "")}
            style={flip ? { right: `${100 - peakLeft}%` } : { left: `${peakLeft}%` }}
            aria-hidden="true"
          >
            <HandArrow className={cn("mb-[-6px] h-9 w-12 shrink-0", flip && "-scale-x-100")} />
            <span className={cn("-mb-1 whitespace-nowrap font-hand text-lg font-semibold leading-tight", flip ? "-rotate-3 text-right" : "rotate-[-4deg]")}>
              busiest day!
              <br />
              {label(max)} on {dayLabel(days[peak].day)}
            </span>
          </div>
        )}

        <div className="relative flex items-end gap-[3px] px-1" style={{ height }} onMouseLeave={() => setActive(null)}>
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              aria-label={`${dayLabel(d.day)}: ${label(d.count)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-none"
            >
              {d.count > 0 ? (
                <span
                  className={cn(
                    "block w-full max-w-[22px] rounded-t-[4px] bg-primary transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-ring",
                    active !== null && active !== i && "opacity-40"
                  )}
                  style={{ height: `${Math.max(5, (d.count / max) * (height - 8))}px` }}
                />
              ) : (
                <span className="mb-[3px] block h-[3px] w-[3px] rounded-full bg-muted-foreground/30" />
              )}
            </button>
          ))}
        </div>

        {/* Pen baseline */}
        <svg viewBox="0 0 400 8" preserveAspectRatio="none" aria-hidden="true" className="-mt-[3px] block h-2 w-full overflow-visible text-foreground/70">
          <path d="M1 4 C 60 2, 120 6, 200 4 S 330 2, 399 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {hovered && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${((active + 0.5) / days.length) * 100}%`, top: NOTE_SPACE - 8 }}
          >
            <span className="text-muted-foreground">{dayLabel(hovered.day, { weekday: "short", day: "numeric", month: "short" })}</span>
            <span className="ml-2 font-semibold text-foreground">
              {label(hovered.count)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between font-hand text-base text-muted-foreground">
        <span>{dayLabel(days[0].day)}</span>
        <span>today</span>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{dayLabel(d.day)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
