import * as XLSX from "xlsx";
import { parseBoothNumber } from "./booth-validation";

export interface BoothBrandItem {
  boothCode: string;
  brandName: string;
  zone: string;
  number: number;
}

export interface ParseSheetResult {
  success: boolean;
  items: BoothBrandItem[];
  totalParsed: number;
  zonesFound: string[];
  errors: string[];
}

/**
 * Universal Excel/CSV Parser for Bazarna Booth-Brand Sheets.
 * Supports:
 * 1. Multi-Zone Columns (e.g. ZONE A (Number, Brand), ZONE B (Number, Brand)...)
 * 2. 2-Column Simple Formats (e.g. Column A: "Booth Number", Column B: "Brand Name")
 * 3. Matrix or tabular layouts with auto-detection of booth codes (e.g. "1A", "20Y", "31B").
 */
export function parseBoothBrandBuffer(buffer: Buffer): ParseSheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const itemsMap = new Map<string, BoothBrandItem>();
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!data || data.length === 0) continue;

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cellVal = String(row[c] || "").trim();
        if (!cellVal) continue;

        // Check if this cell is a booth code (e.g. "1A", "20Y", "31B", "14M", "2D")
        const parsed = parseBoothNumber(cellVal);
        // Valid zone must be non-numeric letters (e.g. A, B, C, D, M, Y, VIP, etc.)
        if (parsed && /^[A-Z]+$/.test(parsed.zone)) {
          const normCode = `${parsed.number}${parsed.zone}`;

          // Find brand name in subsequent cells in the same row
          let brandName = "";
          for (
            let nextC = c + 1;
            nextC <= Math.min(c + 3, row.length - 1);
            nextC++
          ) {
            const candidate = String(row[nextC] || "").trim();
            // Ensure candidate is not another booth code or header keyword
            if (
              candidate &&
              !parseBoothNumber(candidate) &&
              !candidate.toLowerCase().startsWith("zone") &&
              !candidate.toLowerCase().startsWith("number") &&
              !candidate.toLowerCase().startsWith("brand")
            ) {
              brandName = candidate;
              break;
            }
          }

          if (brandName) {
            itemsMap.set(normCode, {
              boothCode: normCode,
              brandName,
              zone: parsed.zone,
              number: parsed.number,
            });
          }
        }
      }
    }
  }

  const items = Array.from(itemsMap.values()).sort((a, b) => {
    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
    return a.number - b.number;
  });

  const zonesFound = Array.from(
    new Set(items.map((it) => it.zone).filter(Boolean))
  ).sort();

  return {
    success: items.length > 0,
    items,
    totalParsed: items.length,
    zonesFound,
    errors,
  };
}
