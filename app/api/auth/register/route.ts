import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

function databaseErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error:
          "Database not connected. On Vercel, set DATABASE_URL to a PostgreSQL URL (e.g. from neon.tech).",
      },
      { status: 503 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. Redeploy on Vercel after setting DATABASE_URL (build runs prisma db push).",
        },
        { status: 503 }
      );
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        brandName: parsed.data.brandName,
        representativeName: parsed.data.representativeName,
        boothNumber: parsed.data.boothNumber,
        email: parsed.data.email,
        password: hashedPassword,
        role: "BRAND",
        entranceType: parsed.data.entranceType,
      },
      select: {
        id: true,
        email: true,
        brandName: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    const dbError = databaseErrorResponse(error);
    if (dbError) return dbError;
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
