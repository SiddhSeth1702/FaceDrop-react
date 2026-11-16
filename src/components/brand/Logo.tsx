import { cn } from "@/lib/utils";

/** default follows the app theme; inverse is for dark grounds; light stays ink on paper whatever the theme. */
type LogoVariant = "default" | "inverse" | "light";

interface LogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}

/** Viewfinder brackets locking onto a lime dot: the guest who was found. */
export const LogoMark = ({ size = 32, variant = "default", className }: LogoMarkProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden="true">
    <rect width="40" height="40" rx="11" className={variant === "inverse" ? "fill-iris-500" : variant === "light" ? "fill-ink-950" : "fill-ink-950 dark:fill-iris-500"} />
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 16.5v-3a3 3 0 0 1 3-3h3" />
      <path d="M23.5 10.5h3a3 3 0 0 1 3 3v3" />
      <path d="M29.5 23.5v3a3 3 0 0 1-3 3h-3" />
      <path d="M16.5 29.5h-3a3 3 0 0 1-3-3v-3" />
    </g>
    <circle cx="20" cy="20" r="4.6" className="fill-lime-500" />
  </svg>
);

interface LogoProps extends LogoMarkProps {
  /** Hide the wordmark and show only the mark. */
  markOnly?: boolean;
}

export const Logo = ({ size = 32, variant = "default", markOnly = false, className }: LogoProps) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <LogoMark size={size} variant={variant} />
    {!markOnly && (
      <span
        className={cn(
          "font-display font-extrabold leading-none tracking-[-0.04em]",
          variant === "inverse" ? "text-white" : variant === "light" ? "text-ink-950" : "text-ink-950 dark:text-white"
        )}
        style={{ fontSize: size * 0.7 }}
      >
        facedrop
        <span className={variant === "inverse" ? "text-lime-500" : "text-iris-500"}>.</span>
      </span>
    )}
    <span className="sr-only">FaceDrop</span>
  </span>
);
