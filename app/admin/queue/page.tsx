"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSocket } from "@/hooks/use-socket";
import { formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { EntranceTabs } from "@/components/entrance-tabs";
import { type EntranceType } from "@/lib/entrance";
import { CheckCircle, Trash2, Search } from "lucide-react";

interface Ticket {
  id: string;
  queueNumber: number;
  status: string;
  brandName: string;
  boothNumber: string;
  requestedAt: string;
  calledAt: string | null;
  completedAt: string | null;
  qrToken: string;
}

export default function AdminQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");

  const fetchQueue = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      search,
      status: statusFilter,
      entrance,
    });
    const res = await fetch(`/api/admin/queue?${params}`);
    if (res.ok) {
      const json = await res.json();
      setTickets(json.tickets);
      setEventId(json.event?.id ?? null);
      setPagination(json.pagination);
    }
    setLoading(false);
  }, [page, search, statusFilter, entrance]);

  useEffect(() => {
    fetch("/api/entrance")
      .then((r) => r.json())
      .then((data) => {
        if (data.entranceType) setEntrance(data.entranceType);
      });
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const pollUrl = `/api/admin/queue?entrance=${entrance}`;
  const { lastUpdate } = useSocket(eventId, pollUrl);

  useEffect(() => {
    if (lastUpdate) fetchQueue();
  }, [lastUpdate, fetchQueue]);

  async function adminAction(
    endpoint: string,
    body?: Record<string, unknown>,
    label?: string
  ) {
    setActionLoading(endpoint);
    const res = await fetch(`${endpoint}?entrance=${entrance}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    setActionLoading(null);

    if (!res.ok) {
      toast.error(json.error ?? "Action failed");
      return;
    }

    toast.success(label ?? "Action completed");
    fetchQueue();
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Queue Management</h1>

        <EntranceTabs
          value={entrance}
          onChange={(type) => {
            setEntrance(type);
            setPage(1);
            fetch("/api/entrance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entranceType: type }),
            });
          }}
          className="mb-6 max-w-md"
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Reset entire queue? This cannot be undone.")) {
                adminAction("/api/admin/queue/reset", undefined, "Queue reset");
              }
            }}
            loading={actionLoading === "/api/admin/queue/reset"}
          >
            <Trash2 className="h-4 w-4" />
            Reset Queue
          </Button>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                placeholder="Search brands..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="pb-3 pr-4 font-medium">#</th>
                  <th className="pb-3 pr-4 font-medium">Brand</th>
                  <th className="pb-3 pr-4 font-medium">Booth</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Requested</th>
                  <th className="pb-3 pr-4 font-medium">Exit Time</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-3 pr-4 font-semibold">
                      #{t.queueNumber}
                    </td>
                    <td className="py-3 pr-4">{t.brandName}</td>
                    <td className="py-3 pr-4">{t.boothNumber}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {formatTime(new Date(t.requestedAt))}
                    </td>
                    <td className="py-3 pr-4">
                      {t.completedAt
                        ? formatTime(new Date(t.completedAt))
                        : t.calledAt
                          ? formatTime(new Date(t.calledAt))
                          : "—"}
                    </td>
                    <td className="py-3">
                      {t.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            adminAction(
                              "/api/admin/queue/complete",
                              { ticketId: t.id },
                              `Marked #${t.queueNumber} complete`
                            )
                          }
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                {pagination.total} total tickets
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-sm">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
