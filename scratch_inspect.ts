import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.actionLog.findMany({
    where: {
      eventId: "cmr9at3cu0002mkn7pwlp9pu5"
    },
    orderBy: { createdAt: "desc" }
  });
  console.log("=== BYOUTH EVENT ACTION LOGS ===");
  console.log(JSON.stringify(logs, null, 2));

  const allLogs = await prisma.actionLog.findMany({
    where: {
      details: {
        contains: "Bazarna Summer Market 2026"
      }
    },
    orderBy: { createdAt: "desc" }
  });
  console.log("=== BYOUTH EVENT NAME LOGS ===");
  console.log(JSON.stringify(allLogs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
