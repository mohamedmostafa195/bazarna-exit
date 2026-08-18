import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { registerSchema } from "../../lib/validations";
import { LOADTEST } from "./config";
import { withDbRetry } from "./db-retry";
import { info, success } from "./logger";

export interface RegisteredClient {
  id: string;
  email: string;
  entranceType: "BAZARNA" | "BYOUTH";
  brandName: string;
}

function clientEmail(entrance: "BAZARNA" | "BYOUTH", index: number) {
  return `${LOADTEST.emailPrefix}${entrance.toLowerCase()}.${index}@${LOADTEST.emailDomain}`;
}

/**
 * Register brand clients the same way as POST /api/auth/register:
 * validated payload, bcrypt password, role BRAND, entranceType set.
 * Booth is assigned later when requesting an exit number (like the dashboard).
 */
export async function registerClients(
  perEntrance: number,
  batchSize: number
): Promise<{ bazarna: RegisteredClient[]; byouth: RegisteredClient[] }> {
  const passwordHash = await bcrypt.hash(LOADTEST.password, 12);
  const entrances = ["BAZARNA", "BYOUTH"] as const;
  const all: RegisteredClient[] = [];

  for (const entrance of entrances) {
    info(`Registering ${perEntrance} ${entrance} clients…`);
    const rows: Array<{
      email: string;
      password: string;
      brandName: string;
      representativeName: string;
      boothNumber: string;
      role: string;
      entranceType: typeof entrance;
    }> = [];

    for (let i = 1; i <= perEntrance; i++) {
      const payload = {
        brandName: `${entrance} Brand ${i}`,
        representativeName: `${entrance} Rep ${i}`,
        email: clientEmail(entrance, i),
        password: LOADTEST.password,
        entranceType: entrance,
      };

      const parsed = registerSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(
          `Invalid registration payload for ${payload.email}: ${parsed.error.issues[0]?.message}`
        );
      }

      rows.push({
        email: parsed.data.email,
        password: passwordHash,
        brandName: parsed.data.brandName,
        representativeName: parsed.data.representativeName,
        boothNumber: "N/A",
        role: "BRAND",
        entranceType: entrance,
      });
    }

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const batchNo = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(rows.length / batchSize);
      await withDbRetry(
        `Register ${entrance} batch ${batchNo}/${totalBatches}`,
        () =>
          prisma.user.createMany({
            data: chunk,
            skipDuplicates: true,
          })
      );
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  for (const entrance of entrances) {
    const users = await withDbRetry(`Load ${entrance} clients`, () =>
      prisma.user.findMany({
        where: {
          email: { endsWith: `@${LOADTEST.emailDomain}` },
          entranceType: entrance,
        },
        select: { id: true, email: true, brandName: true, entranceType: true },
        orderBy: { email: "asc" },
      })
    );

    for (const u of users) {
      all.push({
        id: u.id,
        email: u.email,
        brandName: u.brandName,
        entranceType: u.entranceType as "BAZARNA" | "BYOUTH",
      });
    }
  }

  const bazarna = all.filter((c) => c.entranceType === "BAZARNA");
  const byouth = all.filter((c) => c.entranceType === "BYOUTH");
  success(
    `Registered ${bazarna.length + byouth.length} clients (${bazarna.length} Bazarna, ${byouth.length} Byouth)`
  );

  return { bazarna, byouth };
}
