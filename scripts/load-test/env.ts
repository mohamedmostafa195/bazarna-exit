/**
 * Load-test process env — imported first so Prisma and queue see it.
 * Remote Postgres only allows ~17 Prisma connections; broadcasts would steal them.
 */
process.env.SKIP_QUEUE_BROADCAST ??= "1";

function withPoolSettings(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "12");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "60");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = withPoolSettings(process.env.DATABASE_URL);
}
