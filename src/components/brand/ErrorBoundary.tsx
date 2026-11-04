import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render crashes so users see a way out instead of a blank white page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
        <Logo />
        <div className="max-w-md">
          <p className="mb-2 inline-block -rotate-2 font-hand text-2xl font-semibold leading-tight text-primary">well, that's blurry</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">
            This page hit an unexpected error. Reloading usually fixes it. If it keeps happening, head back to your events.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.location.assign("/")}>
            Back to events
          </Button>
        </div>
      </div>
    );
  }
}
