import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { warn } from "./logger";

const RETRYABLE_CODES = new Set(["P1017", "P1001", "P1002", "P2024"]);

function isRetryable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_CODES.has(error.code);
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Server has closed the connection") ||
    message.includes("ConnectionReset") ||
    message.includes("forcibly closed") ||
    message.includes("Can't reach database") ||
    message.includes("Timed out fetching a new connection")
  );
}

async function reconnect() {
  try {
    await prisma.$disconnect();
  } catch {
    /* already closed */
  }
  await prisma.$connect();
}

export async function withDbRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 6
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = 400 * attempt;
      warn(
        `${label} failed (attempt ${attempt}/${maxAttempts}). Reconnecting in ${delayMs}ms…`
      );
      await reconnect();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
