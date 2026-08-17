import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import { normalizeEmail } from "@/lib/normalize-email";
import { sendPasswordResetEmail } from "@/lib/email";
import { logAction } from "@/lib/action-log";
import { createPasswordResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseJsonBody(request);
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    console.log(`[ForgotPassword] Received reset request for: "${email}"`);

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    // Generic success message to prevent user enumeration attacks
    if (!user) {
      console.log(
        `[ForgotPassword] ⚠️ No registered brand found with email: "${email}". No reset email dispatched.`
      );
      return NextResponse.json({
        message:
          "If an account with that email exists, we've sent a password reset link.",
      });
    }

    console.log(
      `[ForgotPassword] ✓ Found brand user: "${user.brandName}" for email: "${user.email}". Creating token...`
    );

    // Generate secure random token valid for 1 hour
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await createPasswordResetToken(email, token, expiresAt);

    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = process.env.NEXTAUTH_URL ?? `${proto}://${host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    console.log(`[ForgotPassword] 🚀 Sending reset email to: ${email}...`);
    const emailResult = await sendPasswordResetEmail({
      to: email,
      brandName: user.brandName,
      resetUrl,
    });

    if (!emailResult.success) {
      console.error(
        `[ForgotPassword] ❌ Email send failed for ${email}:`,
        emailResult.error
      );
    } else {
      console.log(`[ForgotPassword] ✅ Email successfully sent to ${email}`);
    }

    void logAction({
      action: "PASSWORD_RESET_REQUESTED",
      brandName: user.brandName,
      actorName: user.representativeName,
      details: `Password reset link requested for ${email}`,
    }).catch(() => {});

    return NextResponse.json({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
  }, "POST /api/auth/forgot-password");
}
