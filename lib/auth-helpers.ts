import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

async function resolveUserRole(userId: string, sessionRole?: string | null) {
  const normalized = sessionRole?.toUpperCase();
  if (normalized === "ADMIN" || normalized === "BRAND") {
    return normalized;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role?.toUpperCase() ?? null;
  } catch {
    return null;
  }
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
