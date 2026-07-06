import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  if (context) {
    console.error(`[API ${context}]`, error);
  } else {
    console.error("[API]", error);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return apiError(
      "Database is not connected. Check DATABASE_URL in your environment.",
      503
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return apiError(
          "Cannot reach the database server. Check DATABASE_URL and that the database is running.",
          503
        );
      case "P1002":
        return apiError("Database server timed out. Please try again.", 503);
      case "P2024":
        return apiError(
          "Database is busy. Please wait a moment and try again.",
          503
        );
      case "P2021":
        return apiError(
          "Database tables are missing. Run: npx prisma db push",
          503
        );
      case "P2022":
        return apiError(
          "Database schema is out of date. Run: npx prisma db push",
          503
        );
      case "P2002":
        return apiError("This record already exists.", 409);
      case "P2025":
        return apiError("Record not found.", 404);
      default: {
        const detail =
          process.env.NODE_ENV === "development"
            ? `Database error (${error.code}): ${error.message}`
            : "Database error. Please try again.";
        return apiError(detail, 500);
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError("Invalid data sent to the server.", 400);
  }

  if (error instanceof ZodError) {
    return apiError(error.issues[0]?.message ?? "Invalid input", 400);
  }

  if (error instanceof SyntaxError) {
    return apiError("Invalid request body.", 400);
  }

  if (error instanceof Error && process.env.NODE_ENV === "development") {
    return apiError(error.message, 500);
  }

  return apiError("Something went wrong. Please try again.", 500);
}

export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new SyntaxError("Invalid JSON body");
  }
}

export function withApiHandler(
  handler: () => Promise<NextResponse>,
  context?: string
): Promise<NextResponse> {
  return handler().catch((error) => handleApiError(error, context));
}
