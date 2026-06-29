export const ENTRANCE_TYPES = ["BAZARNA", "BYOUTH"] as const;
export type EntranceType = (typeof ENTRANCE_TYPES)[number];

export const ENTRANCE_COOKIE = "bazarna_entrance";

export function isEntranceType(value: string | null | undefined): value is EntranceType {
  return value === "BAZARNA" || value === "BYOUTH";
}

export function getEntranceLabel(type: EntranceType): string {
  return type === "BAZARNA" ? "Bazarna" : "Byouth";
}

export function getEntranceImage(type: EntranceType): string {
  return type === "BAZARNA" ? "/image/LogoBazarna.jpg" : "/image/ByouthImage.jpg";
}

export function getEntranceDescription(type: EntranceType): string {
  return type === "BAZARNA"
    ? "Separate Bazarna exit queue with its own numbers"
    : "Separate Byouth exit queue with its own numbers";
}

export function getOtherEntranceType(type: EntranceType): EntranceType {
  return type === "BAZARNA" ? "BYOUTH" : "BAZARNA";
}

export function formatQueueNumber(
  queueNumber: number,
  entranceType: EntranceType
): string {
  return `${getEntranceLabel(entranceType)} #${queueNumber}`;
}
