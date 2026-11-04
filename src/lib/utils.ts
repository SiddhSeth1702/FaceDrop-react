import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Reads `status` and `message` off anything thrown by axios or our own code. */
export function describeError(err: unknown): { status?: number; message?: string } {
  if (!err || typeof err !== "object") return {};
  const { status, message } = err as { status?: unknown; message?: unknown };
  return {
    status: typeof status === "number" ? status : undefined,
    message: typeof message === "string" ? message : undefined,
  };
}
