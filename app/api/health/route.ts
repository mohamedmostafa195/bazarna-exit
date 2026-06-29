import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({
      ok: true,
      database: "connected",
      message: "Database is reachable",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        message,
        hint: "Run: npx prisma db push (with production DATABASE_URL) to create tables",
      },
      { status: 503 }
    );
  }
}
