import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS event_booth_brands (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      booth_code TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS event_booth_brands_event_id_booth_code_key 
    ON event_booth_brands(event_id, booth_code);
  `);

  console.log("event_booth_brands table created successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
