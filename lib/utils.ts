import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAppBaseUrl } from "@/lib/app-url";

export {
  combineDateAndTime,
  formatQueueWindow,
  formatTime,
  formatDateOnlyDisplay,
  getQueueWindowState,
  parseDateOnlyToDb,
  toDateInputValue,
  toTimeInputValue,
  type QueueWindowState,
} from "@/lib/datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function getTicketUrl(token: string): string {
  const base = getAppBaseUrl();
  return `${base}/ticket/${token}`;
}
