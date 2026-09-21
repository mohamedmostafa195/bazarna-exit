"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import {
  CheckCircle,
  Trash2,
  Search,
  MessageSquare,
  X,
  PlusCircle,
  UserCheck,
  Sparkles,
  Pencil,
} from "lucide-react";
import {
  parseBoothNumber,
  resolveEventZones,
  normalizeBoothCode,
  type ZoneConfig,
} from "@/lib/booth-validation";
import { BoothNumberPicker } from "@/components/booth-number-picker";
import { BrandAccountPicker } from "@/components/brand-account-picker";

interface Ticket {
  id: string;
  userId?: string;
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

interface BrandUser {
  id: string;
  brandName: string;
  representativeName: string;
  boothNumber: string;
  email: string;
  ticketCount: number;
}

export default function AdminQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventData, setEventData] = useState<{
    id: string;
    eventName?: string;
    zones?: ZoneConfig[];
  } | null>(null);
  const [boothBrands, setBoothBrands] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedNoteTicket, setSelectedNoteTicket] = useState<Ticket | null>(null);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const activeEntranceRef = useRef<EntranceType>("BAZARNA");

  // Issue Ticket Modal state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [brandUsers, setBrandUsers] = useState<BrandUser[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedBoothNumber, setSelectedBoothNumber] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Edit Ticket Modal state
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editBrandId, setEditBrandId] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editBoothNumber, setEditBoothNumber] = useState("");
  const [editStatus, setEditStatus] = useState("WAITING");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Ticket Modal state
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

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
        event?: { id: string; eventName?: string; zones?: ZoneConfig[] };
        boothBrands?: Record<string, string>;
        occupiedBooths?: string[];
        pagination: { total: number; totalPages: number };
      }>(`/api/admin/queue?${params}`);
      // Discard response if user already switched tabs
      if (activeEntranceRef.current !== targetEntrance) return;
      if (ok) {
        setTickets(data.tickets);
        setEventId(data.event?.id ?? null);
        setEventData(data.event ?? null);
        setBoothBrands(data.boothBrands ?? {});
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

  // Load brands for Issue Ticket / Edit Ticket modal
  useEffect(() => {
    if ((isIssueModalOpen || editingTicket) && brandUsers.length === 0) {
      setLoadingBrands(true);
      fetchApi<{ users: BrandUser[] }>("/api/admin/users")
        .then(({ ok, data }) => {
          if (ok && data.users) {
            setBrandUsers(data.users);
          }
        })
        .finally(() => setLoadingBrands(false));
    }
  }, [isIssueModalOpen, editingTicket, brandUsers.length]);

  const occupiedBooths = tickets
    .map((t) => normalizeBoothCode(t.boothNumber))
    .filter((b): b is string => !!b);

  const zones = resolveEventZones(eventData?.zones, entrance).map((z) => {
    const name = z.name.trim().toUpperCase();
    let taken = 0;
    for (let n = 1; n <= z.limit; n++) if (occupiedBooths.includes(`${n}${name}`)) taken++;
    return { ...z, name, remaining: z.limit - taken, isFull: taken >= z.limit };
  });

  const selectedZoneObj = zones.find((z) => z.name === selectedZone);
  const zoneFull = Boolean(selectedZoneObj?.isFull);

  const currentBoothCode =
    selectedZone && selectedBoothNumber
      ? normalizeBoothCode(`${selectedBoothNumber}${selectedZone}`)
      : null;
  const isBoothOccupied = currentBoothCode ? occupiedBooths.includes(currentBoothCode) : false;

  const currentBrandName = currentBoothCode ? boothBrands[currentBoothCode] || "" : "";

  // Map of userId -> active queueNumber
  const activeTicketsByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tickets) {
      const user = brandUsers.find(
        (u) =>
          u.brandName.toLowerCase() === t.brandName.toLowerCase() ||
          (u.boothNumber && normalizeBoothCode(u.boothNumber) === normalizeBoothCode(t.boothNumber))
      );
      if (user) {
        map[user.id] = t.queueNumber;
      }
    }
    return map;
  }, [tickets, brandUsers]);

  // Selected brand user account
  const selectedUser = brandUsers.find((u) => u.id === selectedBrandId) ?? null;

  const brandActiveTicket = selectedUser
    ? tickets.find((t) => t.brandName.toLowerCase() === selectedUser.brandName.toLowerCase())
    : currentBoothCode
    ? tickets.find((t) => normalizeBoothCode(t.boothNumber) === currentBoothCode)
    : null;

  const handleSelectBrandUser = (userId: string) => {
    setSelectedBrandId(userId);
    const user = brandUsers.find((u) => u.id === userId);
    if (user && user.boothNumber && user.boothNumber !== "N/A" && user.boothNumber !== "—") {
      const parsed = parseBoothNumber(user.boothNumber);
      if (parsed) {
        setSelectedZone(parsed.zone);
        setSelectedBoothNumber(String(parsed.number));
      }
    }
  };

  // Edit modal calculations and helper state
  const editOccupiedBooths = useMemo(() => {
    if (!editingTicket) return occupiedBooths;
    const currentTicketBooth = normalizeBoothCode(editingTicket.boothNumber);
    return occupiedBooths.filter((b) => b !== currentTicketBooth);
  }, [occupiedBooths, editingTicket]);

  const editZones = resolveEventZones(eventData?.zones, entrance).map((z) => {
    const name = z.name.trim().toUpperCase();
    let taken = 0;
    for (let n = 1; n <= z.limit; n++) {
      if (editOccupiedBooths.includes(`${n}${name}`)) taken++;
    }
    return { ...z, name, remaining: z.limit - taken, isFull: taken >= z.limit };
  });

  const selectedEditZoneObj = editZones.find((z) => z.name === editZone);
  const editZoneFull = Boolean(selectedEditZoneObj?.isFull);

  const currentEditBoothCode =
    editZone && editBoothNumber
      ? normalizeBoothCode(`${editBoothNumber}${editZone}`)
      : null;
  const isEditBoothOccupied = currentEditBoothCode
    ? editOccupiedBooths.includes(currentEditBoothCode)
    : false;

  const currentEditBrandName = currentEditBoothCode
    ? boothBrands[currentEditBoothCode] || ""
    : "";

  const activeTicketsByUserIdForEdit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tickets) {
      if (t.id === editingTicket?.id) continue;
      const user = brandUsers.find(
        (u) =>
          u.brandName.toLowerCase() === t.brandName.toLowerCase() ||
          (u.boothNumber && normalizeBoothCode(u.boothNumber) === normalizeBoothCode(t.boothNumber))
      );
      if (user) {
        map[user.id] = t.queueNumber;
      }
    }
    return map;
  }, [tickets, brandUsers, editingTicket]);

  const selectedEditUser = brandUsers.find((u) => u.id === editBrandId) ?? null;

  const editBrandActiveTicket = selectedEditUser
    ? tickets.find(
        (t) =>
          t.id !== editingTicket?.id &&
          t.brandName.toLowerCase() === selectedEditUser.brandName.toLowerCase()
      )
    : currentEditBoothCode
    ? tickets.find(
        (t) =>
          t.id !== editingTicket?.id &&
          normalizeBoothCode(t.boothNumber) === currentEditBoothCode
      )
    : null;

  const handleOpenEdit = useCallback((t: Ticket) => {
    setEditingTicket(t);
    setEditBrandId(t.userId || "");
    const parsed = parseBoothNumber(t.boothNumber);
    if (parsed) {
      setEditZone(parsed.zone);
      setEditBoothNumber(String(parsed.number));
    } else {
      setEditZone("");
      setEditBoothNumber("");
    }
    setEditStatus(t.status);
  }, []);

  // Auto-match editBrandId if brandUsers load after edit modal opens
  useEffect(() => {
    if (editingTicket && !editBrandId && brandUsers.length > 0) {
      const matched = brandUsers.find(
        (u) =>
          (editingTicket.userId && u.id === editingTicket.userId) ||
          u.brandName.toLowerCase() === editingTicket.brandName.toLowerCase() ||
          (u.boothNumber && normalizeBoothCode(u.boothNumber) === normalizeBoothCode(editingTicket.boothNumber))
      );
      if (matched) {
        setEditBrandId(matched.id);
      }
    }
  }, [editingTicket, editBrandId, brandUsers]);

  const handleSelectEditBrandUser = (userId: string) => {
    setEditBrandId(userId);
    const user = brandUsers.find((u) => u.id === userId);
    if (user && user.boothNumber && user.boothNumber !== "N/A" && user.boothNumber !== "—") {
      const parsed = parseBoothNumber(user.boothNumber);
      if (parsed) {
        setEditZone(parsed.zone);
        setEditBoothNumber(String(parsed.number));
      }
    }
  };

  async function handleIssueTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBrandId) {
      toast.error("Please select a registered brand account");
      return;
    }
    if (!selectedZone || !selectedBoothNumber) {
      toast.error("Please select both zone and brand / booth");
      return;
    }

    const booth = `${selectedBoothNumber}${selectedZone}`;
    const brandName = selectedUser?.brandName || boothBrands[booth] || "";
    setSubmittingIssue(true);

    const { ok, data } = await fetchApi<{
      error?: string;
      ticket?: { queueNumber: number };
    }>("/api/admin/queue/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedBrandId,
        brandName: brandName || undefined,
        boothNumber: booth,
        entranceType: entrance,
      }),
    });

    setSubmittingIssue(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to issue ticket");
      return;
    }

    toast.success(`Exit #${data.ticket!.queueNumber} successfully issued!`);
    setIsIssueModalOpen(false);
    setSelectedBrandId("");
    setSelectedZone("");
    setSelectedBoothNumber("");
    loadQueue(activeEntranceRef.current, page, search, statusFilter);
  }

  async function handleEditTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editBrandId) {
      toast.error("Please select a registered brand account");
      return;
    }
    if (!editZone || !editBoothNumber) {
      toast.error("Please select both zone and brand / booth");
      return;
    }

    const booth = `${editBoothNumber}${editZone}`;
    const brandName = selectedEditUser?.brandName || boothBrands[booth] || editingTicket.brandName;

    setSubmittingEdit(true);
    const { ok, data } = await fetchApi<{ error?: string }>("/api/admin/queue/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: editingTicket.id,
        userId: editBrandId,
        brandName,
        boothNumber: booth,
        status: editStatus,
      }),
    });
    setSubmittingEdit(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to update ticket");
      return;
    }

    toast.success(`Ticket #${editingTicket.queueNumber} updated successfully!`);
    setEditingTicket(null);
    loadQueue(activeEntranceRef.current, page, search, statusFilter);
  }

  async function handleDeleteTicket() {
    if (!deletingTicket) return;
    setSubmittingDelete(true);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `/api/admin/queue/delete?ticketId=${deletingTicket.id}`,
      { method: "POST" }
    );
    setSubmittingDelete(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to delete ticket");
      return;
    }

    toast.success(`Ticket #${deletingTicket.queueNumber} deleted successfully!`);
    setDeletingTicket(null);
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

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => setIsIssueModalOpen(true)}
              className="gap-2 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Exception Tickets
            </Button>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(t)}
                          title="Edit Ticket"
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingTicket(t)}
                          title="Delete Ticket"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

        {/* Issue Ticket Modal (Admin Override) */}
        {isIssueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Exception Ticket (Admin Override)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Manually issue an exit queue number for a registered brand
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsIssueModalOpen(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleIssueTicket} className="mt-5 space-y-4">
                {/* 1. Registered Brand Account (Required with Search) */}
                <div className="flex flex-col">
                  <label className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                    <span>REGISTERED ACCOUNT</span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 lowercase">
                      * required
                    </span>
                  </label>
                  <BrandAccountPicker
                    users={brandUsers}
                    value={selectedBrandId}
                    onChange={handleSelectBrandUser}
                    disabled={loadingBrands}
                    activeTicketsByUserId={activeTicketsByUserId}
                    placeholder="Search by brand name, email, or rep..."
                  />
                </div>

                {/* 2. Zone + Brand / Booth Dropdowns - exact match to user dashboard */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                      ZONE
                    </label>
                    <select
                      value={selectedZone}
                      onChange={(e) => {
                        setSelectedZone(e.target.value);
                        setSelectedBoothNumber("");
                      }}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      required
                    >
                      <option value="">Select</option>
                      {zones.map((z) => (
                        <option key={z.name} value={z.name} disabled={z.isFull}>
                          Zone {z.name}{z.isFull ? " (Full)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                      BRAND NAME
                    </label>
                    <BoothNumberPicker
                      zone={selectedZone}
                      limit={selectedZoneObj?.limit ?? 0}
                      value={selectedBoothNumber}
                      occupied={occupiedBooths}
                      boothBrands={boothBrands}
                      disabled={!selectedZone || zoneFull}
                      onChange={(val) => {
                        setSelectedBoothNumber(val);
                        // If no account selected yet, try to auto-match
                        const code = `${val}${selectedZone}`;
                        const bName = boothBrands[code] || "";
                        const matched = brandUsers.find(
                          (u) =>
                            (bName && u.brandName.trim().toLowerCase() === bName.trim().toLowerCase()) ||
                            (u.boothNumber && normalizeBoothCode(u.boothNumber) === normalizeBoothCode(code))
                        );
                        if (matched && !selectedBrandId) {
                          setSelectedBrandId(matched.id);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Selected Details Card */}
                {currentBoothCode && (
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Selected Booth & Brand
                        </span>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {currentBrandName || "Unassigned Brand"} — Booth {currentBoothCode}
                        </p>
                      </div>
                      {isBoothOccupied ? (
                        <span className="rounded-lg bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Taken 🔒
                        </span>
                      ) : (
                        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Available ✓
                        </span>
                      )}
                    </div>

                    {selectedUser && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium border-t border-zinc-200/60 pt-2 dark:border-zinc-700/60">
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Account: <strong>{selectedUser.brandName}</strong> ({selectedUser.email})
                        </span>
                      </div>
                    )}

                    {brandActiveTicket && (
                      <p className="mt-2 font-bold text-amber-600 dark:text-amber-400">
                        ⚠️ This brand already has an active ticket (#{brandActiveTicket.queueNumber})!
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsIssueModalOpen(false)}
                    disabled={submittingIssue}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submittingIssue}
                    disabled={!selectedBrandId || !selectedZone || !selectedBoothNumber || isBoothOccupied}
                  >
                    Get Ticket
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Ticket Modal (Same form as Issue Ticket with pre-filled data) */}
        {editingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Edit Ticket #{editingTicket.queueNumber}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Update registered brand account, booth, or status
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditTicket} className="mt-5 space-y-4">
                {/* 1. Registered Brand Account (Required with Search) */}
                <div className="flex flex-col">
                  <label className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                    <span>REGISTERED ACCOUNT</span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 lowercase">
                      * required
                    </span>
                  </label>
                  <BrandAccountPicker
                    users={brandUsers}
                    value={editBrandId}
                    onChange={handleSelectEditBrandUser}
                    disabled={loadingBrands}
                    activeTicketsByUserId={activeTicketsByUserIdForEdit}
                    placeholder="Search by brand name, email, or rep..."
                  />
                </div>

                {/* 2. Zone + Brand / Booth Dropdowns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                      ZONE
                    </label>
                    <select
                      value={editZone}
                      onChange={(e) => {
                        setEditZone(e.target.value);
                        setEditBoothNumber("");
                      }}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      required
                    >
                      <option value="">Select</option>
                      {editZones.map((z) => (
                        <option key={z.name} value={z.name} disabled={z.isFull}>
                          Zone {z.name}{z.isFull ? " (Full)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                      BRAND NAME
                    </label>
                    <BoothNumberPicker
                      zone={editZone}
                      limit={selectedEditZoneObj?.limit ?? 0}
                      value={editBoothNumber}
                      occupied={editOccupiedBooths}
                      boothBrands={boothBrands}
                      disabled={!editZone || editZoneFull}
                      onChange={(val) => {
                        setEditBoothNumber(val);
                        const code = `${val}${editZone}`;
                        const bName = boothBrands[code] || "";
                        const matched = brandUsers.find(
                          (u) =>
                            (bName && u.brandName.trim().toLowerCase() === bName.trim().toLowerCase()) ||
                            (u.boothNumber && normalizeBoothCode(u.boothNumber) === normalizeBoothCode(code))
                        );
                        if (matched && !editBrandId) {
                          setEditBrandId(matched.id);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 3. Ticket Status */}
                <div className="flex flex-col">
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                    STATUS
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="WAITING">WAITING</option>
                    <option value="CALLED">CALLED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                {/* Selected Details Card */}
                {currentEditBoothCode && (
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Selected Booth & Brand
                        </span>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {currentEditBrandName || "Unassigned Brand"} — Booth {currentEditBoothCode}
                        </p>
                      </div>
                      {isEditBoothOccupied ? (
                        <span className="rounded-lg bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Taken 🔒
                        </span>
                      ) : (
                        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Available ✓
                        </span>
                      )}
                    </div>

                    {selectedEditUser && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium border-t border-zinc-200/60 pt-2 dark:border-zinc-700/60">
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Account: <strong>{selectedEditUser.brandName}</strong> ({selectedEditUser.email})
                        </span>
                      </div>
                    )}

                    {editBrandActiveTicket && (
                      <p className="mt-2 font-bold text-amber-600 dark:text-amber-400">
                        ⚠️ This brand already has an active ticket (#{editBrandActiveTicket.queueNumber})!
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTicket(null)}
                    disabled={submittingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submittingEdit}
                    disabled={!editBrandId || !editZone || !editBoothNumber || isEditBoothOccupied}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Ticket Confirmation Modal */}
        {deletingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Delete Ticket #{deletingTicket.queueNumber}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Remove ticket from queue
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingTicket(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Are you sure you want to delete the ticket for{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {deletingTicket.brandName}
                  </strong>{" "}
                  (Booth {deletingTicket.boothNumber})? This action cannot be undone.
                </p>

                {deletingTicket.status === "CALLED" && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                    ⚠️ This ticket is currently being called. Deleting it will clear the active call on the screens.
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingTicket(null)}
                  disabled={submittingDelete}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteTicket}
                  loading={submittingDelete}
                >
                  Delete Ticket
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
