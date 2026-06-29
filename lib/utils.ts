import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getTicketUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/ticket/${token}`;
}

export type QueueWindowState = "before" | "open" | "closed";

export function getQueueWindowState(
  openTime: Date,
  closeTime: Date,
  now = new Date()
): QueueWindowState {
  if (now < openTime) return "before";
  if (now > closeTime) return "closed";
  return "open";
}
