import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType } from "@/lib/entrance";

export const ACTION_TYPES = [
  "QUEUE_REQUESTED",
  "CALL_NEXT",
  "SKIP",
  "RECALL",
  "COMPLETED",
  "CHECKOUT",
  "QUEUE_RESET",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface LogActionParams {
  action: ActionType;
  entranceType?: string | null;
  eventId?: string | null;
  actorName?: string | null;
  brandName?: string | null;
  queueNumber?: number | null;
  details?: string | null;
}

const ACTION_LABELS: Record<ActionType, string> = {
  QUEUE_REQUESTED: "New queue number",
  CALL_NEXT: "Called next",
  SKIP: "Skipped",
  RECALL: "Recalled",
  COMPLETED: "Completed",
  CHECKOUT: "Checked out",
  QUEUE_RESET: "Queue reset",
};

export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  QUEUE_REQUESTED: "A brand requested a queue number",
  CALL_NEXT: "Call the next waiting brand to the exit",
  SKIP: "Skip the current number and call the next one",
  RECALL: "Call a specific number again (brand missed their turn)",
  COMPLETED: "Brand finished exit checkout",
  CHECKOUT: "Brand checked out via QR scanner",
  QUEUE_RESET: "All queue numbers were cleared",
};

const ACTION_COLORS: Record<ActionType, string> = {
  QUEUE_REQUESTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CALL_NEXT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  SKIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  RECALL: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CHECKOUT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  QUEUE_RESET: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action as ActionType] ?? action;
}

export function getActionColor(action: string): string {
  return ACTION_COLORS[action as ActionType] ?? "bg-zinc-100 text-zinc-800";
}

export function getActionSummary(log: {
  action: string;
  brandName?: string | null;
  queueNumber?: number | null;
  actorName?: string | null;
  details?: string | null;
}): string {
  if (log.details) return log.details;

  const brand = log.brandName ? ` — ${log.brandName}` : "";
  const num = log.queueNumber != null ? `#${log.queueNumber}` : "";

  switch (log.action as ActionType) {
    case "QUEUE_REQUESTED":
      return `${log.brandName ?? "Brand"} got ${num}`;
    case "CALL_NEXT":
      return `Called ${num}${brand}`;
    case "SKIP":
      return `Skipped ${num}${brand}`;
    case "RECALL":
      return `Recalled ${num}${brand}`;
    case "COMPLETED":
      return `Completed ${num}${brand}`;
    case "CHECKOUT":
      return `Checked out ${num}${brand}`;
    case "QUEUE_RESET":
      return log.actorName
        ? `${log.actorName} reset the queue`
        : "Queue was reset";
    default:
      return getActionLabel(log.action);
  }
}

export async function logAction(params: LogActionParams) {
  try {
    await prisma.actionLog.create({
      data: {
        action: params.action,
        entranceType: params.entranceType ?? null,
        eventId: params.eventId ?? null,
        actorName: params.actorName ?? null,
        brandName: params.brandName ?? null,
        queueNumber: params.queueNumber ?? null,
        details: params.details ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

export async function getActionLogs(options: {
  entranceType?: string | null;
  limit?: number;
  page?: number;
}) {
  const limit = options.limit ?? 50;
  const page = options.page ?? 1;
  const skip = (page - 1) * limit;

  const where = options.entranceType
    ? { entranceType: options.entranceType }
    : {};

  const [logs, total] = await Promise.all([
    prisma.actionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.actionLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      actionLabel: getActionLabel(log.action),
      entranceType: log.entranceType,
      entranceLabel:
        log.entranceType && isEntranceType(log.entranceType)
          ? getEntranceLabel(log.entranceType)
          : null,
      actorName: log.actorName,
      brandName: log.brandName,
      queueNumber: log.queueNumber,
      details: log.details,
      createdAt: log.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
