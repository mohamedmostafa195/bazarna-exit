"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { QRDisplay } from "@/components/qr-display";
import { useSocket, useCountdown } from "@/hooks/use-socket";
import { formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, Users, Hash } from "lucide-react";

interface QueueData {
  event: {
    id: string;
    eventName: string;
    queueOpenTime: string;
    queueCloseTime: string;
    currentServingNumber: number | null;
  } | null;
  windowState: "before" | "open" | "closed";
  ticket: {
    id: string;
    queueNumber: number;
    status: string;
    qrToken: string;
    requestedAt: string;
  } | null;
  user: { brandName: string; boothNumber: string };
}

export default function DashboardPage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
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
      if (data?.ticket) {
        const updated = (lastUpdate.tickets as { queueNumber: number; status: string }[]).find(
          (t) => t.queueNumber === data.ticket!.queueNumber
        );
        if (updated) {
          setData((prev) =>
            prev?.ticket
              ? { ...prev, ticket: { ...prev.ticket, status: updated.status } }
              : prev
          );
        }
      }
      fetchStatus();
    }
  }, [lastUpdate, data?.ticket, fetchStatus]);

  const openTime = data?.event
    ? new Date(data.event.queueOpenTime)
    : null;
  const countdown = useCountdown(
    data?.windowState === "before" ? openTime : null
  );

  async function handleRequestNumber() {
    setRequesting(true);
    const res = await fetch("/api/queue/request", { method: "POST" });
    const json = await res.json();
    setRequesting(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to get queue number");
      if (json.ticket) fetchStatus();
      return;
    }

    toast.success(`Your exit number is #${json.ticket.queueNumber}!`);
    fetchStatus();
  }

  const brandsBefore =
    data?.ticket && currentServing && data.ticket.status === "WAITING"
      ? Math.max(0, data.ticket.queueNumber - currentServing)
      : null;

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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome, {data?.user.brandName}
          </h1>
          <p className="text-zinc-500">
            Booth {data?.user.boothNumber}
            {data?.event && ` · ${data.event.eventName}`}
          </p>
        </div>

        {!data?.event && (
          <Card>
            <p className="text-center text-zinc-500">
              No active event at the moment. Please check back later.
            </p>
          </Card>
        )}

        {data?.event && !data.ticket && (
          <Card className="text-center">
            {data.windowState === "before" && (
              <>
                <Clock className="mx-auto h-12 w-12 text-orange-500" />
                <h2 className="mt-4 text-xl font-semibold">
                  Exit queue will open at {formatTime(openTime!)}
                </h2>
                {countdown && countdown.total > 0 && (
                  <div className="mt-6 flex justify-center gap-4">
                    {[
                      { label: "Hours", value: countdown.hours },
                      { label: "Minutes", value: countdown.minutes },
                      { label: "Seconds", value: countdown.seconds },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-800"
                      >
                        <p className="text-2xl font-bold tabular-nums">
                          {String(value).padStart(2, "0")}
                        </p>
                        <p className="text-xs text-zinc-500">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="mt-8" disabled>
                  Get My Exit Number
                </Button>
              </>
            )}

            {data.windowState === "open" && (
              <>
                <Hash className="mx-auto h-12 w-12 text-orange-500" />
                <h2 className="mt-4 text-xl font-semibold">
                  Queue is now open!
                </h2>
                <p className="mt-2 text-zinc-500">
                  Click below to get your exit number
                </p>
                <Button
                  className="mt-6"
                  size="lg"
                  loading={requesting}
                  onClick={handleRequestNumber}
                >
                  Get My Exit Number
                </Button>
              </>
            )}

            {data.windowState === "closed" && (
              <>
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                  The exit queue is now closed. Please contact the Bazarna team.
                </h2>
                <Button className="mt-6" disabled>
                  Get My Exit Number
                </Button>
              </>
            )}
          </Card>
        )}

        {data?.ticket && (
          <div className="space-y-6">
            <Card className="text-center">
              <p className="text-sm text-zinc-500">Your Exit Number</p>
              <p className="mt-2 text-6xl font-bold text-orange-600 dark:text-orange-400">
                #{data.ticket.queueNumber}
              </p>
              <div className="mt-4 flex justify-center">
                <StatusBadge status={data.ticket.status} />
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Please wait until your number is called
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <p className="text-sm text-zinc-500">Now Serving</p>
                <p className="mt-1 text-3xl font-bold">
                  {currentServing ? `#${currentServing}` : "—"}
                </p>
              </Card>
              <Card>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <p className="text-sm text-zinc-500">Brands Before You</p>
                </div>
                <p className="mt-1 text-3xl font-bold">
                  {brandsBefore !== null ? brandsBefore : "—"}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-zinc-500">Requested At</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatTime(new Date(data.ticket.requestedAt))}
                </p>
              </Card>
            </div>

            <Card className="flex flex-col items-center">
              <p className="mb-4 text-sm font-medium text-zinc-500">
                Your QR Code
              </p>
              <QRDisplay
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/ticket/${data.ticket.qrToken}`}
              />
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
