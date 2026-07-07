import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.queueTicket.findMany({
    orderBy: { queueNumber: "asc" },
    include: { user: true, event: true }
  });
  console.log("=== ALL QUEUE TICKETS ===");
  console.log(JSON.stringify(tickets.map(t => ({
    id: t.id,
    queueNumber: t.queueNumber,
    brandName: t.user.brandName,
    entranceType: t.event.entranceType,
    eventName: t.event.eventName,
    requestedAt: t.requestedAt
  })), null, 2));

  const events = await prisma.event.findMany();
  console.log("=== ALL EVENTS ===");
  console.log(JSON.stringify(events, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
