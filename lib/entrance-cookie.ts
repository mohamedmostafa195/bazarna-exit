import { NextResponse } from "next/server";
import { ENTRANCE_COOKIE, type EntranceType } from "@/lib/entrance";

const isProduction =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

export function setEntranceCookie(
  response: NextResponse,
  entranceType: EntranceType
) {
  response.cookies.set(ENTRANCE_COOKIE, entranceType, {
    path: "/",
    maxAge: 60 * 60 * 24 * 8,
    sameSite: "lax",
    secure: isProduction,
    httpOnly: false,
  });
}

export function clearEntranceCookie(response: NextResponse) {
  response.cookies.set(ENTRANCE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: isProduction,
    httpOnly: false,
  });
}
