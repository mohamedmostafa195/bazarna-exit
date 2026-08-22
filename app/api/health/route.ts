import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import {
  getEmailDeliverabilityWarning,
  getEmailProvider,
  getEmailSender,
} from "@/lib/email-config";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql");

  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        database: "missing",
        message: "DATABASE_URL is not set on Vercel",
      },
      { status: 503 }
    );
  }

  if (!isPostgres) {
    return NextResponse.json(
      {
        ok: false,
        database: "invalid",
        message:
          "DATABASE_URL must be a PostgreSQL URL (postgresql://...). SQLite does not work on Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const emailProvider = getEmailProvider();
    const emailSender = getEmailSender();
    const emailWarning = getEmailDeliverabilityWarning();

    return NextResponse.json({
      ok: true,
      database: "connected",
      message: "Database is reachable",
      email: {
        provider: emailProvider,
        sender: emailSender.email || null,
        warning: emailWarning,
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/health");
  }
}
