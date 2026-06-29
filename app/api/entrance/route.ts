import { NextResponse } from "next/server";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";

export async function POST(request: Request) {
  const body = await request.json();
  const { entranceType } = body;

  if (!isEntranceType(entranceType)) {
    return NextResponse.json({ error: "Invalid entrance type" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true, entranceType });
  response.cookies.set(ENTRANCE_COOKIE, entranceType, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${ENTRANCE_COOKIE}=([^;]+)`));
  const entranceType = match?.[1] ?? null;

  return NextResponse.json({
    entranceType: isEntranceType(entranceType) ? entranceType : null,
  });
}
