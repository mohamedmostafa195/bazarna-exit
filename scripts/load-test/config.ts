import type { ZoneConfig } from "../../lib/booth-validation";

/** Prefix for all load-test records — safe to delete without touching live data. */
export const LOADTEST = {
  emailPrefix: "loadtest.",
  emailDomain: "bazarna-loadtest.local",
  password: "LoadTest123456",
  eventTag: "LOADTEST",
} as const;

/** Production-like zone layout (Bazarna A–D, Byouth Y). */
export const BASE_ZONES: Record<"BAZARNA" | "BYOUTH", ZoneConfig[]> = {
  BAZARNA: [
    { name: "A", limit: 10 },
    { name: "B", limit: 20 },
    { name: "C", limit: 30 },
    { name: "D", limit: 40 },
  ],
  BYOUTH: [{ name: "Y", limit: 50 }],
};

export interface LoadTestConfig {
  totalClients: number;
  perEntrance: number;
  keepData: boolean;
  skipCleanup: boolean;
  batchSize: number;
  concurrency: number;
}

export function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  let totalClients = 500;
  let keepData = false;
  let skipCleanup = false;
  let concurrency = 8;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--keep") keepData = true;
    else if (arg === "--no-cleanup") skipCleanup = true;
    else if (arg === "--concurrency") {
      const n = parseInt(args[i + 1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) {
        concurrency = n;
        i += 1;
      }
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      const n = parseInt(arg, 10);
      if (Number.isFinite(n) && n > 0) totalClients = n;
    }
  }

  if (totalClients % 2 !== 0) {
    console.warn(
      `[config] ${totalClients} is odd — using ${totalClients - 1} (split evenly across entrances).`
    );
    totalClients -= 1;
  }

  return {
    totalClients,
    perEntrance: totalClients / 2,
    keepData,
    skipCleanup,
    batchSize: 25,
    concurrency,
  };
}

function printHelp() {
  console.log(`
Bazarna Exit Queue — load test

Simulates real client flow:
  1. Register brand accounts (like /api/auth/register)
  2. Create Bazarna + Byouth events with zones (same queue window)
  3. All clients request exit numbers + booth at the same time
  4. All QR codes scanned for exit checkout at the same time

Usage:
  npm run test:queue              # 500 clients (250 Bazarna + 250 Byouth)
  npx tsx scripts/load-test-queue.ts 300
  npx tsx scripts/load-test-queue.ts 500 --keep   # leave test data in DB

Options:
  --keep              Do not delete test users/events after the run
  --no-cleanup        Skip pre-run cleanup (reuse existing loadtest data)
  --concurrency 8     Max DB requests in flight (default 8; remote pool is ~12)
  --help, -h          Show this help
`);
}

/** Scale zone limits so total booth capacity >= client count. */
export function zonesForCapacity(
  entrance: "BAZARNA" | "BYOUTH",
  clientCount: number
): ZoneConfig[] {
  const base = BASE_ZONES[entrance];
  const baseCapacity = base.reduce((sum, z) => sum + z.limit, 0);
  if (clientCount <= baseCapacity) return base.map((z) => ({ ...z }));

  const factor = clientCount / baseCapacity;
  const scaled = base.map((z) => ({
    name: z.name,
    limit: Math.ceil(z.limit * factor),
  }));

  let capacity = scaled.reduce((sum, z) => sum + z.limit, 0);
  while (capacity < clientCount) {
    scaled[scaled.length - 1].limit += 1;
    capacity += 1;
  }

  return scaled;
}

export function zoneCapacity(zones: ZoneConfig[]): number {
  return zones.reduce((sum, z) => sum + z.limit, 0);
}
