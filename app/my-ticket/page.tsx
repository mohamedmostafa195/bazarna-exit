"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { QRDisplay } from "@/components/qr-display";
import { useSocket } from "@/hooks/use-socket";
import { formatTime } from "@/lib/utils";
import Link from "next/link";

interface TicketData {
  event: { id: string; eventName: string; currentServingNumber: number | null } | null;
  ticket: {
    id: string;
    queueNumber: number;
    status: string;
    qrToken: string;
    requestedAt: string;
    calledAt: string | null;
    completedAt: string | null;
  } | null;
  user: { brandName: string; boothNumber: string };
}

export default function MyTicketPage() {
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentServing, setCurrentServing] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/queue/status");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setCurrentServing(json.event?.currentServingNumber ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const { lastUpdate } = useSocket(data?.event?.id ?? null);

  useEffect(() => {
    if (lastUpdate) {
      setCurrentServing(lastUpdate.currentServing);
      fetchStatus();
    }
  }, [lastUpdate, fetchStatus]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!data?.ticket) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">No Ticket Yet</h1>
          <p className="mt-2 text-zinc-500">
            You haven&apos;t requested an exit number yet.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-orange-600 hover:underline dark:text-orange-400"
          >
            Go to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const brandsBefore =
    currentServing && data.ticket.status === "WAITING"
      ? Math.max(0, data.ticket.queueNumber - currentServing)
      : null;

  const ticketUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/ticket/${data.ticket.qrToken}`
      : `/ticket/${data.ticket.qrToken}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">My Ticket</h1>

        <Card className="text-center">
          <p className="text-sm text-zinc-500">{data.user.brandName}</p>
          <p className="text-xs text-zinc-400">Booth {data.user.boothNumber}</p>

          <p className="mt-6 text-7xl font-bold text-orange-600 dark:text-orange-400">
            #{data.ticket.queueNumber}
          </p>

          <div className="mt-4 flex justify-center">
            <StatusBadge status={data.ticket.status} />
          </div>

          <div className="mt-8">
            <QRDisplay value={ticketUrl} size={180} />
          </div>

          <div className="mt-6 space-y-2 text-sm text-zinc-500">
            <p>Now serving: {currentServing ? `#${currentServing}` : "—"}</p>
            {brandsBefore !== null && (
              <p>Brands before you: {brandsBefore}</p>
            )}
            <p>
              Requested: {formatTime(new Date(data.ticket.requestedAt))}
            </p>
            {data.ticket.calledAt && (
              <p>Called: {formatTime(new Date(data.ticket.calledAt))}</p>
            )}
            {data.ticket.completedAt && (
              <p>
                Completed: {formatTime(new Date(data.ticket.completedAt))}
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
