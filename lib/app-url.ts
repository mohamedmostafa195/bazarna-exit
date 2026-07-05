/**
 * Resolve the app base URL. On Vercel, never use localhost from .env.
 */
export function getAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  for (const url of candidates) {
    if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}

/** Call once at startup so NextAuth uses the correct URL on Vercel. */
export function ensureAuthEnv() {
  const base = getAppBaseUrl();
  if (!base.includes("localhost")) {
    process.env.AUTH_URL = base;
    process.env.NEXTAUTH_URL = base;
  }
}

export function getRequestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`;

  try {
    return new URL(request.url).origin;
  } catch {
    return getAppBaseUrl();
  }
}
