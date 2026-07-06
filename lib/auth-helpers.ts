import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getSession() {
  // Required in Next.js 15+ Route Handlers so auth() can read session cookies.
  try {
    await headers();
  } catch {
    /* not in a request context */
  }
  return auth();
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

async function resolveUserRole(userId: string, sessionRole?: string | null) {
  let dbRole: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    dbRole = user?.role?.toUpperCase() ?? null;
  } catch {
    /* fall back to session role */
  }

  // Database is source of truth (fixes stale JWT after seed / role change).
  if (dbRole === "ADMIN") return "ADMIN";

  const normalized = sessionRole?.toUpperCase();
  if (normalized === "ADMIN" || normalized === "BRAND") {
    return normalized;
  }

  return dbRole;
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (result.error) return result;

  const role = await resolveUserRole(
    result.session!.user.id,
    result.session!.user.role
  );

  if (role !== "ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireBrand() {
  const result = await requireAuth();
  if (result.error) return result;

  const role = await resolveUserRole(
    result.session!.user.id,
    result.session!.user.role
  );

  if (role !== "BRAND") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
