import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize-email";

async function getSession(_request?: Request): Promise<Session | null> {
  try {
    await headers();
    await cookies();
  } catch {
    /* not in a request context */
  }
  return auth();
}

export async function requireAuth(request?: Request) {
  void request;
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

async function resolveUserRole(
  userId: string,
  sessionRole?: string | null,
  email?: string | null
) {
  const normalized = sessionRole?.toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";

  try {
    let dbRole: string | null = null;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      dbRole = user?.role?.toUpperCase() ?? null;
    } else if (email) {
      const user = await prisma.user.findFirst({
        where: {
          email: { equals: normalizeEmail(email), mode: "insensitive" },
        },
        select: { role: true },
      });
      dbRole = user?.role?.toUpperCase() ?? null;
    }

    if (dbRole === "ADMIN") return "ADMIN";
    if (dbRole === "BRAND") return "BRAND";
  } catch {
    /* fall back to session role when database is unavailable */
  }

  if (normalized === "BRAND") return "BRAND";
  return null;
}

export async function requireAdmin(request?: Request) {
  const result = await requireAuth(request);
  if (result.error) return result;

  const role = await resolveUserRole(
    result.session!.user.id,
    result.session!.user.role,
    result.session!.user.email
  );

  if (role !== "ADMIN") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }
  return result;
}

export async function requireBrand(request?: Request) {
  const result = await requireAuth(request);
  if (result.error) return result;

  const role = await resolveUserRole(
    result.session!.user.id,
    result.session!.user.role,
    result.session!.user.email
  );

  if (role !== "BRAND") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
