import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize-email";

type AuthRequest = NextRequest & { auth: Session | null };
type RouteContext = { params: Promise<Record<string, string>> };

async function isAdminSession(session: Session): Promise<boolean> {
  const normalized = session.user.role?.toUpperCase();
  if (normalized === "ADMIN") return true;

  try {
    if (session.user.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (user?.role?.toUpperCase() === "ADMIN") return true;
    }

    if (session.user.email) {
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizeEmail(session.user.email),
            mode: "insensitive",
          },
        },
        select: { role: true },
      });
      if (user?.role?.toUpperCase() === "ADMIN") return true;
    }
  } catch {
    /* fall back to session role when database is unavailable */
  }

  return normalized === "ADMIN";
}

/** Wrap admin API handlers with NextAuth session (same mechanism as middleware). */
export function adminRoute(
  handler: (
    req: AuthRequest,
    ctx?: RouteContext
  ) => Promise<Response> | Response
) {
  return auth(async (req, ctx) => {
    if (!req.auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdminSession(req.auth))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return handler(req as AuthRequest, ctx as RouteContext | undefined);
  });
}
