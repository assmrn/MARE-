import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with fixed precision and optional unit suffix. */
export function fmt(value: number, decimals = 0, unit = ""): string {
  return `${value.toFixed(decimals)}${unit}`;
}

/** Format seconds into HH:MM:SS. */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Format a Date as a local HH:MM:SS clock string. */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour12: false });
}
