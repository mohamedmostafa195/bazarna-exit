"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";
import { Users, CheckCircle, Clock, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { EntranceTabs } from "@/components/entrance-tabs";
import { getEntranceLabel, type EntranceType } from "@/lib/entrance";
import { fetchApi } from "@/lib/fetch-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";

interface DashboardStats {
  event: {
    id: string;
    eventName: string;
    queueOpenTime: string;
    queueCloseTime: string;
    currentServingNumber: number | null;
  } | null;
  stats: {
    currentServing: number | null;
    upcoming: number[];
    totalWaiting: number;
    totalCompleted: number;
    total: number;
    totalNotes?: number;
  } | null;
  notes?: {
    id: string;
    queueNumber: number;
    brandName: string;
    boothNumber: string;
    status: string;
    note: string;
    requestedAt: string;
  }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const activeEntranceRef = useRef<EntranceType>("BAZARNA");

  const loadData = useCallback(async (targetEntrance: EntranceType) => {
    const { ok, data } = await fetchApi<DashboardStats>(
      `/api/admin/dashboard?entrance=${targetEntrance}`
    );
    // Discard response if user already switched to another entrance tab
    if (activeEntranceRef.current !== targetEntrance) return;
    if (ok) {
      setData(data);
    }
    setLoading(false);
  }, []);

  // Initial load: resolve cookie entrance first to prevent mount flicker
  useEffect(() => {
    let isSubscribed = true;
    fetchApi<{ entranceType?: EntranceType }>("/api/entrance").then(({ data }) => {
      if (!isSubscribed) return;
      const initial = data.entranceType ?? "BAZARNA";
      setEntrance(initial);
      activeEntranceRef.current = initial;
      loadData(initial);
    });
    return () => {
      isSubscribed = false;
    };
  }, [loadData]);

  // Tab change handler: instantaneous state update + fast direct fetch
  const handleEntranceChange = useCallback(
    (newEntrance: EntranceType) => {
      if (newEntrance === activeEntranceRef.current) return;
      setEntrance(newEntrance);
      activeEntranceRef.current = newEntrance;

      // Immediately fetch for selected tab
      loadData(newEntrance);

      // Persist in cookie in background
      fetchApi("/api/entrance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entranceType: newEntrance }),
      });
    },
    [loadData]
  );

  const pollUrl = `/api/admin/dashboard?entrance=${entrance}`;
  const { lastUpdate } = useSocket(data?.event?.id ?? null, pollUrl);

  useEffect(() => {
    if (lastUpdate && !loading) {
      loadData(activeEntranceRef.current);
    }
  }, [lastUpdate, loading, loadData]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const stats = data?.stats;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-500">
              {data?.event?.eventName ?? `No active ${getEntranceLabel(entrance)} event`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/queue">
              <Button variant="outline">Manage Queue</Button>
            </Link>
          </div>
        </div>

        <EntranceTabs
          value={entrance}
          onChange={handleEntranceChange}
          className="mb-6 max-w-md"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Waiting</p>
                <p className="text-2xl font-bold">{stats?.totalWaiting ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Completed</p>
                <p className="text-2xl font-bold">
                  {stats?.totalCompleted ?? 0}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Total Tickets</p>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Notes & Feedback</p>
                <p className="text-2xl font-bold">{stats?.totalNotes ?? data?.notes?.length ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Brand Notes & Feedback Section */}
        {data?.notes && data.notes.length > 0 && (
          <Card className="mt-6" title="Brand Notes & Feedback">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.notes.map((n) => (
                <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        #{n.queueNumber}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {n.brandName}
                      </span>
                      <span className="text-xs text-zinc-400">
                        (Booth {n.boothNumber})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={n.status} />
                      <span className="text-xs text-zinc-400">
                        {formatTime(new Date(n.requestedAt))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm text-zinc-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-zinc-200">
                    <p className="whitespace-pre-wrap leading-relaxed">{n.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Link
                href={`/admin/queue?status=notes`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                View all in Queue Management
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        )}

        {stats?.upcoming && stats.upcoming.length > 0 && (
          <Card className="mt-6" title="Upcoming Numbers">
            <div className="flex flex-wrap gap-3">
              {stats.upcoming.map((num) => (
                <span
                  key={num}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-lg font-semibold dark:bg-zinc-800"
                >
                  #{num}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
