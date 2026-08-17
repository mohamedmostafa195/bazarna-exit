import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { logAction } from "@/lib/action-log";
import {
  deletePasswordResetTokensByEmail,
  getValidPasswordResetToken,
} from "@/lib/password-reset";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseJsonBody(request);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const resetRecord = await getValidPasswordResetToken(token);

    if (!resetRecord) {
      return NextResponse.json(
        {
          error:
            "This password reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: resetRecord.email, mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await deletePasswordResetTokensByEmail(resetRecord.email);

    void logAction({
      action: "PASSWORD_RESET_COMPLETED",
      brandName: user.brandName,
      actorName: user.representativeName,
      details: `Password reset successfully for ${user.email}`,
    }).catch(() => {});

    return NextResponse.json({
      message:
        "Your password has been reset successfully. You can now sign in.",
    });
  }, "POST /api/auth/reset-password");
}
