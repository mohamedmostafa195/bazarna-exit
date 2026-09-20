import * as fs from "fs";
import { parseBoothBrandBuffer } from "../lib/excel-booth-parser";

const csvPath =
  "C:/Users/Roma-hp/.gemini/antigravity-ide/brain/edfc3e52-354b-4cb5-9a9a-4d62a5398c5f/.system_generated/steps/427/content.md";
const fileContent = fs.readFileSync(csvPath, "utf8");
const lines = fileContent.split("\n");
const idx = lines.findIndex((l) => l.trim() === "---");
const csvText = lines.slice(idx + 1).join("\n").trim();

const buf = Buffer.from(csvText, "utf8");
const res = parseBoothBrandBuffer(buf);

console.log("=== PARSER TEST RESULTS ===");
console.log("Total booths parsed:", res.totalParsed);
console.log("Zones detected:", res.zonesFound);
console.log("Sample items (first 6):", res.items.slice(0, 6));
console.log("Find 20Y:", res.items.find((i) => i.boothCode === "20Y"));
console.log("Find 1A:", res.items.find((i) => i.boothCode === "1A"));
console.log("Find 31B:", res.items.find((i) => i.boothCode === "31B"));
console.log("Find 44Y:", res.items.find((i) => i.boothCode === "44Y"));
