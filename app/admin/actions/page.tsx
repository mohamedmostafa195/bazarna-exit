"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntranceTabs } from "@/components/entrance-tabs";
import { getActionColor, getActionLabel } from "@/lib/action-log";
import { type EntranceType } from "@/lib/entrance";
import { formatTime } from "@/lib/utils";
import { Activity, RefreshCw } from "lucide-react";

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

export default function AdminActionsPage() {
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const [showAll, setShowAll] = useState(false);
  const [logs, setLogs] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "30",
      entrance: showAll ? "all" : entrance,
    });
    const res = await fetch(`/api/admin/actions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    }
    setLoading(false);
  }, [entrance, page, showAll]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  function describeAction(log: ActionItem): string {
    const parts: string[] = [];
    if (log.brandName) parts.push(log.brandName);
    if (log.queueNumber != null) parts.push(`#${log.queueNumber}`);
    if (log.details) return log.details;
    if (parts.length) return parts.join(" · ");
    return getActionLabel(log.action);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-7 w-7 text-orange-500" />
              Activity Log
            </h1>
            <p className="text-zinc-500">
              All queue actions — updates every 5 seconds
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <EntranceTabs
            value={entrance}
            onChange={(type) => {
              setShowAll(false);
              setEntrance(type);
              setPage(1);
            }}
            className="max-w-md flex-1"
          />
          <Button
            variant={showAll ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setShowAll(true);
              setPage(1);
            }}
          >
            Show all exits
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-zinc-500">
              No actions yet. Activity appears when brands request numbers or
              admins manage the queue.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {log.actionLabel}
                      </span>
                      {log.entranceLabel && (
                        <span className="text-xs text-zinc-500">
                          {log.entranceLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                      {describeAction(log)}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {log.actorName && `By ${log.actorName} · `}
                      {formatTime(new Date(log.createdAt))}
                      {" · "}
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
