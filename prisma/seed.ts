import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureAllEntranceEvents } from "../lib/event-admin";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bazarna.com" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@bazarna.com",
      password: adminPassword,
      brandName: "Bazarna",
      representativeName: "Admin",
      boothNumber: "N/A",
      role: "ADMIN",
    }, 
  });

  const yassminePassword = await bcrypt.hash("yassminePassword", 12);
  const yassmineEmail = "yassmine@bazarna.com";

  // Migrate legacy mixed-case email if present 
  const legacyYassmine = await prisma.user.findFirst({
    where: { email: { equals: yassmineEmail, mode: "insensitive" } },
  });
  if (legacyYassmine && legacyYassmine.email !== yassmineEmail) {
    await prisma.user.update({
      where: { id: legacyYassmine.id },
      data: { email: yassmineEmail },
    });
  }

  const yassmineAdmin = await prisma.user.upsert({
    where: { email: yassmineEmail },
    update: { password: yassminePassword, role: "ADMIN" },
    create: {
      email: yassmineEmail,
      password: yassminePassword,
      brandName: "Bazarna",
      representativeName: "Yassmine",
      boothNumber: "N/A",
      role: "ADMIN",
    },
  });

  const scannerPassword = await bcrypt.hash("scannerPassword", 12);
  const scannerEmail = "scanner@bazarna.com";

  // Migrate legacy mixed-case email if present 
  const legacyScanner = await prisma.user.findFirst({
    where: { email: { equals: scannerEmail, mode: "insensitive" } },
  });
  if (legacyScanner && legacyScanner.email !== scannerEmail) {
    await prisma.user.update({
      where: { id: legacyScanner.id },
      data: { email: scannerEmail },
    });
  }

  const scannerUser = await prisma.user.upsert({
    where: { email: scannerEmail },
    update: { password: scannerPassword, role: "SCANNER" },
    create: {
      email: scannerEmail,
      password: scannerPassword,
      brandName: "Bazarna",
      representativeName: "Scanner",
      boothNumber: "N/A",
      role: "SCANNER",
    },
  });

  const { bazarna: bazarnaEvent, byouth: byouthEvent } =
    await ensureAllEntranceEvents();

  const brandPassword = await bcrypt.hash("brand123456", 12);
  await prisma.user.upsert({
    where: { email: "brand@example.com" },
    update: {},
    create: {
      email: "brand@example.com",
      password: brandPassword,
      brandName: "XYZ Fashion",
      representativeName: "Jane Doe",
      boothNumber: "B42",
      role: "BRAND",
      entranceType: "BAZARNA",
    },
  });

  console.log("Seed complete!");
  console.log("Admin:", admin.email, "/ admin123456");
  console.log("Admin:", yassmineAdmin.email, "/ yassminePassword");
  console.log("Scanner:", scannerUser.email, "/ scannerPassword");
  console.log("Brand: brand@example.com / brand123456");
  console.log("Bazarna event:", bazarnaEvent.eventName);
  console.log("Byouth event:", byouthEvent.eventName);

  await syncNextQueueNumbers();
}

async function syncNextQueueNumbers() {
  const events = await prisma.event.findMany({ select: { id: true } });
  for (const event of events) {
    const max = await prisma.queueTicket.aggregate({
      where: { eventId: event.id },
      _max: { queueNumber: true },
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { nextQueueNumber: (max._max.queueNumber ?? 0) + 1 },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
