import type { ZoneConfig } from "../../lib/booth-validation";
import type { RegisteredClient } from "./register-clients";

export interface ClientWithBooth extends RegisteredClient {
  boothNumber: string;
}

/**
 * Assign a unique booth per client inside zone limits (mirrors dashboard dropdown).
 * Fills each zone in order: A 1–limit, then B 1–limit, and so on.
 */
export function assignBoothsToClients(
  clients: RegisteredClient[],
  zones: ZoneConfig[]
): ClientWithBooth[] {
  const slots: string[] = [];
  for (const zone of zones) {
    const name = zone.name.trim().toUpperCase();
    for (let n = 1; n <= zone.limit; n++) {
      slots.push(`${n}${name}`);
    }
  }

  if (clients.length > slots.length) {
    const capacity = slots.length;
    const zoneSummary = zones
      .map((z) => `${z.name.trim().toUpperCase()}:${z.limit}`)
      .join(", ");
    throw new Error(
      `Not enough booth capacity (${capacity}) for ${clients.length} clients. Zones: ${zoneSummary}`
    );
  }

  return clients.map((client, index) => ({
    ...client,
    boothNumber: slots[index],
  }));
}
