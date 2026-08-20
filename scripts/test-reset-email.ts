import "../scripts/load-test/env";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail } from "../lib/email";
import { getEmailProvider, isEmailConfigured } from "../lib/email-config";

const email = process.argv[2] ?? "mohameddmostafaa19@gmail.com";

async function main() {
  console.log("Email provider:", getEmailProvider());
  console.log("Configured:", isEmailConfigured());

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user) {
    console.error("No user found for:", email);
    process.exit(1);
  }

  console.log("User:", {
    email: user.email,
    brand: user.brandName,
    role: user.role,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=test-debug-${Date.now()}`;

  const result = await sendPasswordResetEmail({
    to: user.email,
    brandName: user.brandName,
    resetUrl,
  });

  console.log("Send result:", result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
