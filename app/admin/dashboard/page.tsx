"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";
import { Users, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { EntranceTabs } from "@/components/entrance-tabs";
import { getEntranceLabel, type EntranceType } from "@/lib/entrance";
import { fetchApi } from "@/lib/fetch-api";

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
  } | null;
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>

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
