"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntranceTabs } from "@/components/entrance-tabs";
import {
  getActionColor,
  getActionLabel,
  getActionSummary,
  type ActionType,
} from "@/lib/action-log";
import { type EntranceType } from "@/lib/entrance";
import { fetchApi } from "@/lib/fetch-api";
import { formatRelativeTime, formatTime } from "@/lib/utils";
import {
  Activity,
  RefreshCw,
  UserPlus,
  PhoneForwarded,
  SkipForward,
  RotateCcw,
  CheckCircle,
  ScanLine,
  Trash2,
} from "lucide-react";

interface ActionItem {
  id: string;
  action: string;
  actionLabel: string;
  entranceLabel: string | null;
  actorName: string | null;
  brandName: string | null;
  queueNumber: number | null;
  details: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  QUEUE_REQUESTED: UserPlus,
  CALL_NEXT: PhoneForwarded,
  SKIP: SkipForward,
  RECALL: RotateCcw,
  COMPLETED: CheckCircle,
  CHECKOUT: ScanLine,
  QUEUE_RESET: Trash2,
};

const FILTER_OPTIONS: { id: string; label: string; types?: ActionType[] }[] = [
  { id: "all", label: "All" },
  { id: "calls", label: "Calls", types: ["CALL_NEXT", "RECALL"] },
  { id: "skips", label: "Skips", types: ["SKIP"] },
  { id: "done", label: "Done", types: ["COMPLETED", "CHECKOUT"] },
  { id: "join", label: "Joined", types: ["QUEUE_REQUESTED"] },
];

export default function AdminActionsPage() {
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const [showAll, setShowAll] = useState(true);
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const activeEntranceRef = useRef<string>("all");

  activeEntranceRef.current = showAll ? "all" : entrance;

  const fetchLogs = useCallback(async () => {
    const targetEntrance = activeEntranceRef.current;
    const params = new URLSearchParams({
      page: "1",
      limit: "50",
      entrance: targetEntrance,
    });
    const { ok, data } = await fetchApi<{ logs: ActionItem[] }>(
      `/api/admin/actions?${params}`
    );
    if (activeEntranceRef.current !== targetEntrance) return;
    if (ok) setLogs(data.logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const activeFilter = FILTER_OPTIONS.find((f) => f.id === filter);
  const filtered = logs.filter((log) => {
    if (!activeFilter?.types) return true;
    return activeFilter.types.includes(log.action as ActionType);
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-7 w-7 text-orange-500" />
              Activity
            </h1>
            <p className="text-sm text-zinc-500">Live feed · refreshes every 5s</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-orange-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Exit filter */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAll(true)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              showAll
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Both exits
          </button>
          <EntranceTabs
            value={entrance}
            onChange={(type) => {
              setShowAll(false);
              setEntrance(type);
            }}
            className="max-w-xs flex-1"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="py-12 text-center text-zinc-500">No activity yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const Icon = ACTION_ICONS[log.action] ?? Activity;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div
                    className={`mt-0.5 rounded-lg p-2 ${getActionColor(log.action)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {getActionLabel(log.action)}
                      </span>
                      {log.entranceLabel && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                          {log.entranceLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-medium text-zinc-900 break-words [overflow-wrap:anywhere] dark:text-zinc-100">
                      {getActionSummary(log)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatRelativeTime(new Date(log.createdAt))}
                      {" · "}
                      {formatTime(new Date(log.createdAt))}
                      {log.actorName && ` · ${log.actorName}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
