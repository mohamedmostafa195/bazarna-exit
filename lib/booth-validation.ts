export interface ZoneConfig {
  name: string;
  limit: number;
}

export interface BoothParseResult {
  number: number;
  zone: string;
}

export interface BoothValidationResult {
  valid: boolean;
  error?: string;
  parsed?: BoothParseResult;
  formattedBooth?: string;
}

/**
 * Parses a booth number string like "12A", "12 A", "A12", "1Y".
 * Returns null if the format is invalid.
 */
export function parseBoothNumber(boothInput: string): BoothParseResult | null {
  const trimmed = boothInput.trim();
  if (!trimmed) return null;

  // Case 1: Number followed by Zone letter/name (e.g., "12A", "101-B", "5 ZoneA")
  const numFirstMatch = trimmed.match(/^(\d+)\s*([a-zA-Z0-9_-]+)$/);
  if (numFirstMatch) {
    const num = parseInt(numFirstMatch[1], 10);
    const zoneStr = numFirstMatch[2].trim().toUpperCase();
    if (!isNaN(num) && num > 0 && zoneStr.length > 0) {
      return { number: num, zone: zoneStr };
    }
  }

  // Case 2: Zone letter/name followed by Number (e.g., "A12", "ZoneA 5")
  const zoneFirstMatch = trimmed.match(/^([a-zA-Z_-]+)\s*(\d+)$/);
  if (zoneFirstMatch) {
    const zoneStr = zoneFirstMatch[1].trim().toUpperCase();
    const num = parseInt(zoneFirstMatch[2], 10);
    if (!isNaN(num) && num > 0 && zoneStr.length > 0) {
      return { number: num, zone: zoneStr };
    }
  }

  return null;
}

export function normalizeBoothCode(
  booth: string | null | undefined
): string | null {
  if (!booth) return null;
  const parsed = parseBoothNumber(booth);
  if (parsed) return `${parsed.number}${parsed.zone}`;
  const trimmed = booth.trim().toUpperCase();
  if (!trimmed || trimmed === "—" || trimmed === "N/A") return null;
  return trimmed;
}

/**
 * Returns a valid example placeholder string based on active zones and limit values.
 * E.g., if limit is 10 for Zone Y, returns "e.g. 5Y".
 */
export function getBoothPlaceholder(
  zones?: ZoneConfig[],
  isByouthFallback = false
): string {
  if (!zones || zones.length === 0) {
    return isByouthFallback ? "e.g. 5Y, 10Y" : "e.g. 12A, 5B";
  }

  const examples = zones.slice(0, 2).map((z) => {
    const safeNum = Math.min(5, z.limit) || 1;
    return `${safeNum}${z.name.trim().toUpperCase()}`;
  });

  return `e.g. ${examples.join(", ")}`;
}

/** Fallback booth zones when an event has none configured yet. */
export function getDefaultZones(entranceType?: string | null): ZoneConfig[] {
  if (entranceType === "BYOUTH") {
    return [{ name: "Y", limit: 50 }];
  }

  return [
    { name: "A", limit: 10 },
    { name: "B", limit: 20 },
    { name: "C", limit: 30 },
    { name: "D", limit: 40 },
  ];
}

export function resolveEventZones(
  zones: ZoneConfig[] | null | undefined,
  entranceType?: string | null
): ZoneConfig[] {
  if (zones && zones.length > 0) {
    return zones.map((z) => ({
      name: z.name.trim().toUpperCase(),
      limit: z.limit,
    }));
  }

  return getDefaultZones(entranceType);
}

/**
 * Validates a booth number against an event's zone configurations.
 */
export function validateBoothAgainstZones(
  boothInput: string,
  zones: ZoneConfig[]
): BoothValidationResult {
  const trimmed = boothInput.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter your booth number." };
  }

  if (!zones || zones.length === 0) {
    // If no zones are defined for the event, accept basic booth format
    return { valid: true, formattedBooth: trimmed.toUpperCase() };
  }

  const parsed = parseBoothNumber(trimmed);
  const sampleNum = Math.min(5, zones[0].limit) || 1;
  const sampleBooth = `${sampleNum}${zones[0].name.trim().toUpperCase()}`;
  const zoneNamesList = zones.map((z) => z.name.trim().toUpperCase()).join(", ");

  if (!parsed) {
    return {
      valid: false,
      error: `Please enter booth number & zone (e.g. ${sampleBooth}). Available: ${zoneNamesList}`,
    };
  }

  // Find matching zone (case-insensitive)
  const targetZone = zones.find(
    (z) => z.name.trim().toUpperCase() === parsed.zone
  );

  if (!targetZone) {
    return {
      valid: false,
      error: `Zone "${parsed.zone}" is invalid. Available: ${zoneNamesList}`,
    };
  }

  if (parsed.number < 1 || parsed.number > targetZone.limit) {
    return {
      valid: false,
      error: `Zone ${targetZone.name.trim().toUpperCase()} numbers must be between 1 and ${targetZone.limit}.`,
    };
  }

  const formattedBooth = `${parsed.number}${targetZone.name.trim().toUpperCase()}`;

  return {
    valid: true,
    parsed: {
      number: parsed.number,
      zone: targetZone.name.trim().toUpperCase(),
    },
    formattedBooth,
  };
}
