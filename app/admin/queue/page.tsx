"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSocket } from "@/hooks/use-socket";
import { formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { EntranceTabs } from "@/components/entrance-tabs";
import { type EntranceType } from "@/lib/entrance";
import { CheckCircle, Trash2, Search, MessageSquare, X, Pencil } from "lucide-react";

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
  note?: string | null;
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
  const [selectedNoteTicket, setSelectedNoteTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editBoothNumber, setEditBoothNumber] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const activeEntranceRef = useRef<EntranceType>("BAZARNA");

  const loadQueue = useCallback(
    async (
      targetEntrance: EntranceType,
      targetPage = page,
      targetSearch = search,
      targetFilter = statusFilter
    ) => {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
        search: targetSearch,
        status: targetFilter,
        entrance: targetEntrance,
      });
      const { ok, data } = await fetchApi<{
        tickets: Ticket[];
        event?: { id: string };
        pagination: { total: number; totalPages: number };
      }>(`/api/admin/queue?${params}`);
      // Discard response if user already switched tabs
      if (activeEntranceRef.current !== targetEntrance) return;
      if (ok) {
        setTickets(data.tickets);
        setEventId(data.event?.id ?? null);
        setPagination(data.pagination);
      }
      setLoading(false);
    },
    [page, search, statusFilter]
  );

  // Initial load: resolve cookie entrance first to prevent mount flicker
  useEffect(() => {
    let isSubscribed = true;
    fetchApi<{ entranceType?: EntranceType }>("/api/entrance").then(({ data }) => {
      if (!isSubscribed) return;
      const initial = data.entranceType ?? "BAZARNA";
      setEntrance(initial);
      activeEntranceRef.current = initial;
      loadQueue(initial);
    });
    return () => {
      isSubscribed = false;
    };
  }, [loadQueue]);

  // Tab change handler: instant state update + fast direct fetch
  const handleEntranceChange = useCallback(
    (newEntrance: EntranceType) => {
      if (newEntrance === activeEntranceRef.current) return;
      setEntrance(newEntrance);
      activeEntranceRef.current = newEntrance;
      setPage(1);

      // Immediately fetch for new tab
      loadQueue(newEntrance, 1);

      // Persist in cookie in background
      fetchApi("/api/entrance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entranceType: newEntrance }),
      });
    },
    [loadQueue]
  );

  // Re-fetch when page, search, or statusFilter changes
  useEffect(() => {
    if (!loading) {
      loadQueue(activeEntranceRef.current, page, search, statusFilter);
    }
  }, [page, search, statusFilter, loading, loadQueue]);

  const pollUrl = `/api/admin/queue?entrance=${entrance}`;
  const { lastUpdate } = useSocket(eventId, pollUrl);

  useEffect(() => {
    if (lastUpdate && !loading) {
      loadQueue(activeEntranceRef.current, page, search, statusFilter);
    }
  }, [lastUpdate, loading, loadQueue, page, search, statusFilter]);

  async function adminAction(
    endpoint: string,
    body?: Record<string, unknown>,
    label?: string
  ) {
    setActionLoading(endpoint);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `${endpoint}?entrance=${activeEntranceRef.current}`,
      {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    setActionLoading(null);

    if (!ok) {
      toast.error(data.error ?? "Action failed");
      return;
    }

    toast.success(label ?? "Action completed");
    loadQueue(activeEntranceRef.current, page, search, statusFilter);
  }

  function handleStartEdit(t: Ticket) {
    setEditingTicket(t);
    setEditBrandName(t.brandName);
    setEditBoothNumber(t.boothNumber);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTicket) return;

    if (!editBrandName.trim()) {
      toast.error("Brand name cannot be empty");
      return;
    }
    if (!editBoothNumber.trim()) {
      toast.error("Booth number cannot be empty");
      return;
    }

    setSavingEdit(true);
    const { ok, data } = await fetchApi<{
      error?: string;
      ticket?: { id: string; brandName: string; boothNumber: string };
    }>("/api/admin/queue/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: editingTicket.id,
        brandName: editBrandName.trim(),
        boothNumber: editBoothNumber.trim().toUpperCase(),
      }),
    });
    setSavingEdit(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to update ticket");
      return;
    }

    toast.success(`Updated ticket #${editingTicket.queueNumber}`);
    setEditingTicket(null);
    loadQueue(activeEntranceRef.current, page, search, statusFilter);
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
          onChange={handleEntranceChange}
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
              <option value="notes">Has Note / Feedback 📝</option>
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
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.brandName}</div>
                      {t.note && (
                        <button
                          type="button"
                          onClick={() => setSelectedNoteTicket(t)}
                          className="mt-1 flex max-w-[200px] items-center gap-1 truncate rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 active:scale-95 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                          title={t.note}
                        >
                          <MessageSquare className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="truncate">{t.note}</span>
                        </button>
                      )}
                    </td>
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
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(t)}
                          title="Edit Brand & Booth"
                          className="h-8 w-8 p-0 text-zinc-500 hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-400 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                            title="Mark Complete"
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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

        {/* Edit Ticket Modal */}
        {editingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Edit Ticket #{editingTicket.queueNumber}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Update brand name and booth allocation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    placeholder="e.g. Mostafaa"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Booth Number
                  </label>
                  <input
                    type="text"
                    value={editBoothNumber}
                    onChange={(e) => setEditBoothNumber(e.target.value.toUpperCase())}
                    required
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm uppercase text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    placeholder="e.g. 17A, 1Y, 5B"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTicket(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={savingEdit}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Note Viewer Modal */}
        {selectedNoteTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Exit Note & Feedback
                    </h3>
                    <p className="text-xs text-zinc-500">
                      #{selectedNoteTicket.queueNumber} • {selectedNoteTicket.brandName} (Booth {selectedNoteTicket.boothNumber})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNoteTicket(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 [overflow-wrap:anywhere]">
                  {selectedNoteTicket.note}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (
                      confirm(
                        `Delete note for #${selectedNoteTicket.queueNumber} (${selectedNoteTicket.brandName})?`
                      )
                    ) {
                      const { ok, data } = await fetchApi<{ error?: string }>(
                        `/api/admin/feedback?ticketId=${selectedNoteTicket.id}`,
                        { method: "DELETE" }
                      );
                      if (ok) {
                        toast.success(`Deleted note for #${selectedNoteTicket.queueNumber}`);
                        setSelectedNoteTicket(null);
                        loadQueue(activeEntranceRef.current);
                      } else {
                        toast.error(data.error ?? "Failed to delete note");
                      }
                    }
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Note
                </Button>
                <Button onClick={() => setSelectedNoteTicket(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
