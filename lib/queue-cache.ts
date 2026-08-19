import {
  ENTRANCE_COOKIE,
  getEntranceLabel,
  isEntranceType,
  type EntranceType,
} from "@/lib/entrance";

export const QUEUE_CACHE_KEY = "bazarna_queue_status_v1";

export interface QueueCacheData {
  entranceType?: EntranceType;
  entranceLabel?: string | null;
  event?: unknown;
  windowState?: "before" | "open" | "closed";
  ticket?: unknown;
  user?: { brandName: string; boothNumber: string };
}

export function getEntranceFromDocumentCookie(): EntranceType | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`${ENTRANCE_COOKIE}=([^;]+)`)
  );
  const value = match?.[1] ?? null;
  return isEntranceType(value) ? value : null;
}

export function readQueueCache<T extends QueueCacheData>(
  expectedEntrance?: EntranceType | null
): T | null {
  if (typeof sessionStorage === "undefined") return null;

  const entrance = expectedEntrance ?? getEntranceFromDocumentCookie();

  try {
    const raw = sessionStorage.getItem(QUEUE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as T;
    if (
      entrance &&
      parsed.entranceType &&
      parsed.entranceType !== entrance
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeQueueCache<T extends QueueCacheData>(data: T) {
  try {
    sessionStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function clearQueueCache() {
  try {
    sessionStorage.removeItem(QUEUE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function writeOptimisticEntranceCache(
  entranceType: EntranceType,
  user: { brandName: string; boothNumber: string }
) {
  writeQueueCache({
    entranceType,
    entranceLabel: getEntranceLabel(entranceType),
    event: null,
    windowState: "closed",
    ticket: null,
    user,
  });
}
