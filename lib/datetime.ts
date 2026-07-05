/** Parse YYYY-MM-DD to a stable UTC noon Date (no timezone shift on date). */
export function parseDateOnlyToDb(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/** YYYY-MM-DD for <input type="date"> from a stored ISO timestamp. */
export function toDateInputValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** HH:mm for <input type="time"> — uses the browser's local timezone. */
export function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Combine a calendar date + wall-clock time from the admin's browser
 * into a UTC ISO string for storage.
 */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateOnlyDisplay(iso: string | Date): string {
  const parts = toDateInputValue(iso).split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString();
}

export function formatQueueWindow(open: Date, close: Date): string {
  return `${formatTime(open)} – ${formatTime(close)}`;
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
