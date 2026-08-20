import type { ScanResult } from "./run-scan";
import { fail, info, success } from "./logger";

export interface ScanAnalysis {
  label: string;
  expected: number;
  successCount: number;
  completedInDb: number;
  duplicateScanBlocked: number;
  errors: string[];
}

function analyzeGroup(
  label: string,
  results: ScanResult[],
  expected: number
): ScanAnalysis {
  const ok = results.filter((r) => !r.error && !r.alreadyCompleted);
  const duplicateScanBlocked = results.filter(
    (r) => r.alreadyCompleted && r.error === "Already completed"
  ).length;
  const errors = results
    .filter((r) => r.error && !r.alreadyCompleted)
    .map((r) => `#${r.queueNumber ?? "?"} ${r.qrToken.slice(0, 8)}…: ${r.error}`);

  return {
    label,
    expected,
    successCount: ok.length,
    completedInDb: ok.length,
    duplicateScanBlocked,
    errors,
  };
}

export function analyzeScanResults(
  results: ScanResult[],
  perEntrance: number
): { bazarna: ScanAnalysis; byouth: ScanAnalysis; passed: boolean } {
  const bazarna = analyzeGroup(
    "Bazarna",
    results.filter((r) => r.entrance === "BAZARNA"),
    perEntrance
  );
  const byouth = analyzeGroup(
    "Byouth",
    results.filter((r) => r.entrance === "BYOUTH"),
    perEntrance
  );

  const passed =
    bazarna.successCount === perEntrance &&
    byouth.successCount === perEntrance &&
    bazarna.errors.length === 0 &&
    byouth.errors.length === 0;

  return { bazarna, byouth, passed };
}

export function printScanReport(
  elapsedMs: number,
  bazarna: ScanAnalysis,
  byouth: ScanAnalysis,
  passed: boolean
) {
  info(`Scan time: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log("");

  for (const row of [bazarna, byouth]) {
    console.log(`   ${row.label} exit scan`);
    console.log(
      `     Checked out: ${row.successCount}/${row.expected}  |  errors: ${row.errors.length}`
    );
    if (row.errors.length) {
      fail(`${row.label} scan errors (first 5):`);
      for (const err of row.errors.slice(0, 5)) console.log(`       - ${err}`);
    }
    console.log("");
  }

  if (passed) {
    success("PASS — all QR scans completed checkout successfully");
  } else {
    fail("FAIL — some exit scans did not complete");
  }
}
