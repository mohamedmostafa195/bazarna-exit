import type { QueueRequestResult } from "./run-queue";
import { fail, info, success } from "./logger";

export interface QueueAnalysis {
  label: string;
  expected: number;
  successCount: number;
  uniqueQueueNumbers: number;
  uniqueBooths: number;
  min: number | null;
  max: number | null;
  sequential: boolean;
  duplicateQueueNumbers: number[];
  duplicateBooths: string[];
  missingNumbers: number[];
  errors: string[];
}

function analyzeGroup(
  label: string,
  results: QueueRequestResult[],
  expected: number
): QueueAnalysis {
  const ok = results.filter((r) => r.queueNumber != null && !r.error);
  const numbers = ok.map((r) => r.queueNumber!).sort((a, b) => a - b);
  const booths = ok.map((r) => r.boothNumber.toUpperCase());
  const errors = results.filter((r) => r.error).map((r) => `${r.email}: ${r.error}`);

  const uniqueNumbers = new Set(numbers);
  const duplicateQueueNumbers = numbers.filter(
    (n, i) => i > 0 && numbers[i - 1] === n
  );
  const boothSet = new Set(booths);
  const duplicateBooths = booths.filter(
    (b, i) => booths.indexOf(b) !== i
  );

  const missingNumbers: number[] = [];
  for (let i = 1; i <= ok.length; i++) {
    if (!uniqueNumbers.has(i)) missingNumbers.push(i);
  }

  const sequential =
    ok.length === expected &&
    uniqueNumbers.size === expected &&
    numbers[0] === 1 &&
    numbers[numbers.length - 1] === expected &&
    missingNumbers.length === 0 &&
    duplicateQueueNumbers.length === 0 &&
    boothSet.size === expected;

  return {
    label,
    expected,
    successCount: ok.length,
    uniqueQueueNumbers: uniqueNumbers.size,
    uniqueBooths: boothSet.size,
    min: numbers[0] ?? null,
    max: numbers[numbers.length - 1] ?? null,
    sequential,
    duplicateQueueNumbers: [...new Set(duplicateQueueNumbers)],
    duplicateBooths: [...new Set(duplicateBooths)],
    missingNumbers: missingNumbers.slice(0, 20),
    errors,
  };
}

export function analyzeResults(
  results: QueueRequestResult[],
  perEntrance: number
): { bazarna: QueueAnalysis; byouth: QueueAnalysis; passed: boolean } {
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
    bazarna.sequential &&
    byouth.sequential &&
    bazarna.errors.length === 0 &&
    byouth.errors.length === 0 &&
    bazarna.min === 1 &&
    byouth.min === 1;

  return { bazarna, byouth, passed };
}

export function printReport(
  elapsedMs: number,
  bazarna: QueueAnalysis,
  byouth: QueueAnalysis,
  passed: boolean
) {
  info(`Total time: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log("");

  for (const row of [bazarna, byouth]) {
    console.log(`   ${row.label}`);
    console.log(
      `     Queue tickets: ${row.successCount}/${row.expected}  |  #${row.min ?? "—"} → #${row.max ?? "—"}  |  sequential: ${row.sequential ? "yes" : "no"}`
    );
    console.log(
      `     Unique booths: ${row.uniqueBooths}/${row.expected}  |  errors: ${row.errors.length}`
    );
    if (row.duplicateQueueNumbers.length) {
      fail(`${row.label} duplicate queue numbers: ${row.duplicateQueueNumbers.join(", ")}`);
    }
    if (row.duplicateBooths.length) {
      fail(`${row.label} duplicate booths: ${row.duplicateBooths.join(", ")}`);
    }
    if (row.missingNumbers.length) {
      fail(
        `${row.label} missing numbers (sample): ${row.missingNumbers.join(", ")}`
      );
    }
    if (row.errors.length) {
      fail(`${row.label} errors (first 5):`);
      for (const err of row.errors.slice(0, 5)) console.log(`       - ${err}`);
      if (row.errors.length > 5) {
        console.log(`       - … ${row.errors.length - 5} more`);
      }
    }
    console.log("");
  }

  if (passed) success("PASS — both queues are independent and numbered #1, #2, #3…");
  else fail("FAIL — review errors above");
}
