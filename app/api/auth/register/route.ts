import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseJsonBody(request);
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
  }, "POST /api/auth/register");
}
