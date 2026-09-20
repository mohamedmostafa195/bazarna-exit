import { prisma } from "../lib/prisma";
import { parseBoothBrandBuffer } from "../lib/excel-booth-parser";

async function main() {
  const googleSheetUrl =
    "https://docs.google.com/spreadsheets/d/1d_ghkwwuc0oelOdVZR1gzZPlYPOEwLWzuy3P7z-xCLI/export?format=csv";

  console.log("Fetching Google Sheet CSV...");
  const res = await fetch(googleSheetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: HTTP ${res.status}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const parsed = parseBoothBrandBuffer(buf);
  console.log(`Parsed ${parsed.totalParsed} booth-brand records across zones:`, parsed.zonesFound);

  // Get active events
  const events = await prisma.event.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${events.length} active events:`, events.map((e) => `${e.eventName} (${e.entranceType})`));

  for (const event of events) {
    // Delete existing
    await prisma.$executeRawUnsafe(
      `DELETE FROM event_booth_brands WHERE event_id = $1`,
      event.id
    );

    let count = 0;
    for (const item of parsed.items) {
      const id = `ebb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO event_booth_brands (id, event_id, booth_code, brand_name, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (event_id, booth_code)
         DO UPDATE SET brand_name = EXCLUDED.brand_name`,
        id,
        event.id,
        item.boothCode,
        item.brandName
      );
      count++;
    }
    console.log(`Saved ${count} booths for event ${event.eventName} (${event.id})`);
  }

  console.log("Done importing brand allocations!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
