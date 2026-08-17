import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export interface PasswordResetRecord {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
}

export async function createPasswordResetToken(
  email: string,
  token: string,
  expiresAt: Date
) {
  const id = randomBytes(16).toString("hex");
  // Clean up any existing tokens for this email first
  await prisma.$executeRaw`
    DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER(${email})
  `;

  await prisma.$executeRaw`
    INSERT INTO password_reset_tokens (id, email, token, expires_at, created_at)
    VALUES (${id}, ${email}, ${token}, ${expiresAt}, NOW())
  `;
}

export async function getValidPasswordResetToken(
  token: string
): Promise<PasswordResetRecord | null> {
  const records = await prisma.$queryRaw<PasswordResetRecord[]>`
    SELECT id, email, token, expires_at AS "expiresAt"
    FROM password_reset_tokens
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  return records.length > 0 ? records[0] : null;
}

export async function deletePasswordResetTokensByEmail(email: string) {
  await prisma.$executeRaw`
    DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER(${email})
  `;
}
