import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hand-drawn pen circle around a number, e.g. the match count. */
export const PenCircled = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className="relative mx-[0.15em] inline-block">
    {children}
    <svg
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute -left-[28%] -top-[20%] h-[140%] w-[156%] overflow-visible text-primary", className)}
    >
      <path
        d="M58 5 C 26 1, 3 14, 6 33 C 9 53, 52 59, 81 50 C 99 43, 97 15, 70 7 C 57 3, 42 5, 31 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  </span>
);

/** A wobbly pen underline under a word. */
export const Scribbled = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className="relative inline-block whitespace-nowrap">
    {children}
    <svg
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute -bottom-[0.18em] left-0 h-[0.4em] w-full overflow-visible text-primary", className)}
    >
      <path d="M2 8 C 40 3, 80 11, 120 6 S 180 4, 198 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  </span>
);

/** A loose hand-drawn arrow curving down-left, for margin notes. */
export const HandArrow = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 60 40" aria-hidden="true" className={cn("overflow-visible", className)}>
    <path d="M56 4 C 44 6, 26 10, 14 30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M8 22 L 13 32 L 23 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
