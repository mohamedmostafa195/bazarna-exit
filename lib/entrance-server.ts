import { cookies } from "next/headers";
import {
  ENTRANCE_COOKIE,
  type EntranceType,
  isEntranceType,
} from "@/lib/entrance";

export async function getEntranceFromCookies(): Promise<EntranceType | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ENTRANCE_COOKIE)?.value;
  return isEntranceType(value) ? value : null;
}

export function getEntranceFromRequest(request: Request): EntranceType | null {
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get("entrance");
  if (isEntranceType(fromQuery)) return fromQuery;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`${ENTRANCE_COOKIE}=([^;]+)`)
  );
  if (match && isEntranceType(match[1])) return match[1];

  return null;
}

export async function resolveEntranceType(
  request?: Request,
  sessionEntrance?: string | null
): Promise<EntranceType | null> {
  if (sessionEntrance && isEntranceType(sessionEntrance)) {
    return sessionEntrance;
  }
  if (request) {
    const fromRequest = getEntranceFromRequest(request);
    if (fromRequest) return fromRequest;
  }
  return getEntranceFromCookies();
}
