/**
 * Bazarna Exit Queue — professional load test
 *
 * End-to-end simulation:
 *   1. Register ~500 brand clients (normal registration flow)
 *   2. Create Bazarna + Byouth events with zones (same queue window)
 *   3. Assign unique booth numbers per zone limits
 *   4. Fire all "Get My Exit Number" requests at the same time
 *   5. Verify queue order + separate entrances
 *
 * Usage:
 *   npm run test:queue
 *   npx tsx scripts/load-test-queue.ts 500
 *   npx tsx scripts/load-test-queue.ts 500 --keep
 */
import "./load-test/env";
import { prisma } from "../lib/prisma";
import { parseArgs, zonesForCapacity, zoneCapacity, LOADTEST } from "./load-test/config";
import { cleanupLoadTestData } from "./load-test/cleanup";
import { registerClients } from "./load-test/register-clients";
import { createLoadTestEvents } from "./load-test/create-events";
import { assignBoothsToClients } from "./load-test/assign-booths";
import { fireAllEntrancesAtOnce } from "./load-test/run-queue";
import { analyzeResults, printReport } from "./load-test/analyze-results";
import { phase, info, timing, warn } from "./load-test/logger";

async function main() {
  const config = parseArgs();
  const bazarnaZones = zonesForCapacity("BAZARNA", config.perEntrance);
  const byouthZones = zonesForCapacity("BYOUTH", config.perEntrance);

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Bazarna Exit Queue — Load Test");
  console.log("══════════════════════════════════════════════════════════");
  info(`Clients: ${config.totalClients} (${config.perEntrance} per entrance)`);
  info(`In-flight queue requests: ${config.concurrency} (remote DB pool is limited)`);
  info(
    `Bazarna zones (${zoneCapacity(bazarnaZones)} booths): ${bazarnaZones.map((z) => `${z.name}:${z.limit}`).join(", ")}`
  );
  info(
    `Byouth zones (${zoneCapacity(byouthZones)} booths): ${byouthZones.map((z) => `${z.name}:${z.limit}`).join(", ")}`
  );

  phase("Setup — remove previous load-test data", "setup");
  if (!config.skipCleanup) {
    const t0 = Date.now();
    await cleanupLoadTestData();
    timing("Cleanup", t0);
  } else {
    warn("Skipped pre-run cleanup (--no-cleanup)");
  }

  phase(`Register ${config.totalClients} brand clients`, "register");
  const tRegister = Date.now();
  const { bazarna: bazarnaClients, byouth: byouthClients } =
    await registerClients(config.perEntrance, config.batchSize);
  timing("Registration", tRegister);

  phase("Create Bazarna + Byouth events (same time window)", "events");
  const tEvents = Date.now();
  const { bazarna: bazarnaEvent, byouth: byouthEvent } =
    await createLoadTestEvents(bazarnaZones, byouthZones);
  timing("Events", tEvents);

  phase("Assign booth numbers (zones + limits)", "assign");
  const bazarnaWithBooths = assignBoothsToClients(
    bazarnaClients,
    bazarnaEvent.zones
  );
  const byouthWithBooths = assignBoothsToClients(
    byouthClients,
    byouthEvent.zones
  );
  info(
    `Sample booths — Bazarna: ${bazarnaWithBooths[0]?.boothNumber}, ${bazarnaWithBooths[1]?.boothNumber} … | Byouth: ${byouthWithBooths[0]?.boothNumber}, ${byouthWithBooths[1]?.boothNumber} …`
  );

  phase(
    `Concurrent queue — ${config.totalClients} clients click Get My Exit Number`,
    "queue"
  );
  const tQueue = Date.now();
  const results = await fireAllEntrancesAtOnce(
    bazarnaWithBooths,
    byouthWithBooths,
    bazarnaEvent.id,
    byouthEvent.id,
    config.concurrency
  );
  timing("Queue requests", tQueue);

  phase("Results", "report");
  const { bazarna, byouth, passed } = analyzeResults(
    results,
    config.perEntrance
  );
  printReport(Date.now() - tQueue, bazarna, byouth, passed);

  if (!config.keepData) {
    phase("Cleanup test data", "cleanup");
    await cleanupLoadTestData();
    info("Removed load-test users, events, and tickets");
  } else {
    warn("Keeping test data in database (--keep)");
    info(`Test accounts: *@${LOADTEST.emailDomain}  password: ${LOADTEST.password}`);
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
  await prisma.$disconnect();
  process.exit(passed ? 0 : 1);
}

main().catch(async (error) => {
  console.error("\nLoad test crashed:", error);
  try {
    await cleanupLoadTestData();
  } catch {
    /* ignore */
  }
  await prisma.$disconnect();
  process.exit(1);
});
