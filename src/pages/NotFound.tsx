import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6 py-12 text-center">
      <Link to="/">
        <Logo />
      </Link>

      {/* An empty polaroid: nobody in this frame */}
      <figure className="polaroid relative w-56 rotate-[-4deg]">
        <span className="tape" />
        <div className="relative flex aspect-[4/5] items-center justify-center rounded-[3px] bg-inverse">
          <span className="finder [--c:hsl(var(--ink-600))]" />
          <span className="font-display text-6xl font-extrabold text-white/90">404</span>
        </div>
        <figcaption className="px-1 pb-3 pt-2.5 font-hand text-xl font-semibold text-ink-800">
          nobody in this frame
        </figcaption>
      </figure>

      <div className="max-w-md">
        <h1 className="text-[34px] font-bold leading-tight">This page wandered off</h1>
        <p className="mt-3 text-muted-foreground">
          The link might be old, or the page was moved. Let's get you back to your events.
        </p>
      </div>

      <Button asChild size="lg">
        <Link to="/">Back to FaceDrop</Link>
      </Button>
    </div>
  );
};

export default NotFound;
