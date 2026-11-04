import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating. The number is always given as text too, so it isn't conveyed by the icons alone. */
export const Stars = ({ rating, className }: { rating: number; className?: string }) => (
  <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={cn("h-3.5 w-3.5", n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        strokeWidth={2}
      />
    ))}
  </span>
);
