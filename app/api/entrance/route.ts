import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entranceType } = body;

  if (!isEntranceType(entranceType)) {
    return NextResponse.json({ error: "Invalid entrance type" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { entranceType },
  });

  const response = NextResponse.json({ success: true, entranceType });
  response.cookies.set(ENTRANCE_COOKIE, entranceType, {
    path: "/",
    maxAge: 60 * 60 * 24 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ENTRANCE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${ENTRANCE_COOKIE}=([^;]+)`));
  const fromCookie = match?.[1] ?? null;
  const entranceType = isEntranceType(fromCookie) ? fromCookie : null;

  return NextResponse.json({ entranceType });
}
