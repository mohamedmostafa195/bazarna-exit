import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bazarna.com" },
    update: {},
    create: {
      email: "admin@bazarna.com",
      password: adminPassword,
      brandName: "Bazarna",
      representativeName: "Admin",
      boothNumber: "N/A",
      role: "ADMIN",
    },
  });

  const today = new Date();
  const openTime = new Date(today);
  openTime.setHours(9, 0, 0, 0);
  const closeTime = new Date(today);
  closeTime.setHours(23, 0, 0, 0);

  await prisma.event.deleteMany({});
  const event = await prisma.event.create({
    data: {
      eventName: "Bazarna Summer Market 2026",
      eventDate: today,
      queueOpenTime: openTime,
      queueCloseTime: closeTime,
      isActive: true,
    },
  });

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
    },
  });

  console.log("Seed complete!");
  console.log("Admin:", admin.email, "/ admin123456");
  console.log("Brand: brand@example.com / brand123456");
  console.log("Event:", event.eventName);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
