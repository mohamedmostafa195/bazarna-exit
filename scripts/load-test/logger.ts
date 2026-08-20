type Phase =
  | "setup"
  | "register"
  | "events"
  | "assign"
  | "queue"
  | "scan"
  | "report"
  | "cleanup";

const icons: Record<Phase, string> = {
  setup: "⚙",
  register: "👤",
  events: "📅",
  assign: "🏷",
  queue: "🚀",
  scan: "📱",
  report: "📊",
  cleanup: "🧹",
};

export function phase(title: string, step: Phase) {
  console.log(`\n${icons[step]}  ${title}`);
  console.log("─".repeat(Math.min(60, title.length + 4)));
}

export function info(message: string) {
  console.log(`   ${message}`);
}

export function success(message: string) {
  console.log(`   ✓ ${message}`);
}

export function warn(message: string) {
  console.warn(`   ! ${message}`);
}

export function fail(message: string) {
  console.error(`   ✗ ${message}`);
}

export function timing(label: string, startedMs: number) {
  const sec = ((Date.now() - startedMs) / 1000).toFixed(1);
  info(`${label}: ${sec}s`);
}
