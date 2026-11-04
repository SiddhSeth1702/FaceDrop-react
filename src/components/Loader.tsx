import React from "react";
import { LogoMark } from "@/components/brand/Logo";

interface LoaderProps {
  open: boolean;
}

/** Full-screen blocking loader used by LoaderContext. */
const Loader: React.FC<LoaderProps> = ({ open }) => {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/60 backdrop-blur-sm animate-in fade-in-0"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-inverse px-8 py-6 text-white shadow-lift">
        <LogoMark size={44} variant="inverse" className="animate-pulse" />
        <span className="font-hand text-xl font-semibold text-lime-500">one sec...</span>
      </div>
    </div>
  );
};

export default Loader;
