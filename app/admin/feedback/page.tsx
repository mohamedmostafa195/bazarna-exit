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
import { type EntranceType, getEntranceLabel } from "@/lib/entrance";
import { MessageSquare, Search, CheckCircle, Store, Clock } from "lucide-react";

interface FeedbackItem {
  id: string;
  queueNumber: number;
  status: string;
  brandName: string;
  boothNumber: string;
  representativeName: string;
  requestedAt: string;
  calledAt: string | null;
  completedAt: string | null;
  qrToken: string;
  note: string;
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const activeEntranceRef = useRef<EntranceType>("BAZARNA");

  const loadFeedback = useCallback(
    async (
      targetEntrance: EntranceType,
      targetPage = page,
      targetSearch = search
    ) => {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
        search: targetSearch,
        status: "all",
        entrance: targetEntrance,
      });

      const { ok, data } = await fetchApi<{
        feedback: FeedbackItem[];
        event?: { id: string; eventName: string };
        pagination: { total: number; totalPages: number };
      }>(`/api/admin/feedback?${params}`);

      if (activeEntranceRef.current !== targetEntrance) return;
      if (ok) {
        setItems(data.feedback);
        setEventId(data.event?.id ?? null);
        setEventName(data.event?.eventName ?? "");
        setPagination(data.pagination);
      }
      setLoading(false);
    },
    [page, search]
  );

  useEffect(() => {
    let isSubscribed = true;
    fetchApi<{ entranceType?: EntranceType }>("/api/entrance").then(({ data }) => {
      if (!isSubscribed) return;
      const initial = data.entranceType ?? "BAZARNA";
      setEntrance(initial);
      activeEntranceRef.current = initial;
      loadFeedback(initial);
    });
    return () => {
      isSubscribed = false;
    };
  }, [loadFeedback]);

  const handleEntranceChange = useCallback(
    (newEntrance: EntranceType) => {
      if (newEntrance === activeEntranceRef.current) return;
      setEntrance(newEntrance);
      activeEntranceRef.current = newEntrance;
      setPage(1);
      loadFeedback(newEntrance, 1);

      fetchApi("/api/entrance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entranceType: newEntrance }),
      });
    },
    [loadFeedback]
  );

  useEffect(() => {
    if (!loading) {
      loadFeedback(activeEntranceRef.current, page, search);
    }
  }, [page, search, loading, loadFeedback]);

  const pollUrl = `/api/admin/feedback?entrance=${entrance}`;
  const { lastUpdate } = useSocket(eventId, pollUrl);

  useEffect(() => {
    if (lastUpdate && !loading) {
      loadFeedback(activeEntranceRef.current, page, search);
    }
  }, [lastUpdate, loading, loadFeedback, page, search]);

  async function handleMarkComplete(ticketId: string, queueNumber: number) {
    setCompletingId(ticketId);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `/api/admin/queue/complete?entrance=${activeEntranceRef.current}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      }
    );
    setCompletingId(null);

    if (!ok) {
      toast.error(data.error ?? "Failed to mark complete");
      return;
    }

    toast.success(`Marked #${queueNumber} complete`);
    loadFeedback(activeEntranceRef.current, page, search);
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
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Notes & Feedback
            </h1>
            <p className="text-sm text-zinc-500">
              {eventName || `All feedback for ${getEntranceLabel(entrance)}`}
            </p>
          </div>
        </div>

        <EntranceTabs
          value={entrance}
          onChange={handleEntranceChange}
          className="mb-6 max-w-md"
        />

        {/* Filters */}
        <Card className="mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by brand, booth, note text..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </Card>

        {/* Feedback List */}
        {items.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-zinc-800 dark:text-zinc-200">
                No Notes or Feedback Found
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {search
                  ? "Try clearing filters to view all feedback."
                  : "Brands haven't submitted any exit notes for this queue yet."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="transition hover:border-orange-200 dark:hover:border-orange-900/50">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 font-extrabold text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                      #{item.queueNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                          {item.brandName}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          <Store className="h-3 w-3" />
                          Booth {item.boothNumber}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Requested at {formatTime(new Date(item.requestedAt))}
                        {item.completedAt && ` • Exited at ${formatTime(new Date(item.completedAt))}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(item.id, item.queueNumber)}
                        loading={completingId === item.id}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Vendor Note:</span>
                  </div>
                  <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">
                    {item.note}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {pagination.total} total notes
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
      </div>
    </AppShell>
  );
}
