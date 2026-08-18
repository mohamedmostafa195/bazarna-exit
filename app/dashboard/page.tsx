"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { QRDisplay } from "@/components/qr-display";
import { useSocket, useCountdown } from "@/hooks/use-socket";
import { formatQueueWindow, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import {
  type EntranceType,
  getEntranceImage,
  getEntranceLabel,
  isEntranceType,
} from "@/lib/entrance";
import { Clock, Users, Hash, CalendarCheck, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { validateBoothAgainstZones, getBoothPlaceholder, type ZoneConfig } from "@/lib/booth-validation";

interface QueueData {
  event: {
    id: string;
    eventName: string;
    queueOpenTime: string;
    queueCloseTime: string;
    currentServingNumber: number | null;
    zones?: ZoneConfig[];
  } | null;
  windowState: "before" | "open" | "closed";
  ticket: {
    id: string;
    queueNumber: number;
    status: string;
    qrToken: string;
    requestedAt: string;
  } | null;
  otherEntranceTicket?: {
    id: string;
    queueNumber: number;
    status: string;
    qrToken: string;
    entranceType: "BAZARNA" | "BYOUTH";
    entranceLabel: string;
    eventName: string;
  } | null;
  entranceType?: "BAZARNA" | "BYOUTH";
  entranceLabel?: string;
  eventDayPassed?: boolean;
  queueEndedToday?: boolean;
  user: { brandName: string; boothNumber: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [currentServing, setCurrentServing] = useState<number | null>(null);
  const [boothNumberInput, setBoothNumberInput] = useState("");

  const fetchStatus = useCallback(async () => {
    const { ok, data, status } = await fetchApi<
      QueueData & { error?: string; needsEntrance?: boolean }
    >("/api/queue/status");

    if (status === 400 && data.needsEntrance) {
      window.location.href = "/";
      return;
    }

    if (ok) {
      setData(data);
      setCurrentServing(data.event?.currentServingNumber ?? null);
      if (
        data.user?.boothNumber &&
        data.user.boothNumber !== "—" &&
        data.user.boothNumber !== "N/A"
      ) {
        setBoothNumberInput((prev) => prev || data.user.boothNumber);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const { lastUpdate } = useSocket(
    data?.event?.id ?? null,
    "/api/queue/status"
  );

  useEffect(() => {
    if (!lastUpdate) return;

    setCurrentServing(lastUpdate.currentServing);

    if (data?.ticket) {
      const updated = (
        lastUpdate.tickets as { queueNumber: number; status: string }[]
      ).find((t) => t.queueNumber === data.ticket!.queueNumber);
      if (updated) {
        setData((prev) =>
          prev?.ticket
            ? { ...prev, ticket: { ...prev.ticket, status: updated.status } }
            : prev
        );
      }
    }
  }, [lastUpdate, data?.ticket]);

  const openTime = data?.event
    ? new Date(data.event.queueOpenTime)
    : null;
  const closeTime = data?.event
    ? new Date(data.event.queueCloseTime)
    : null;
  const countdown = useCountdown(
    data?.windowState === "before" ? openTime : null
  );

  async function handleRequestNumber() {
    const trimmedBooth = boothNumberInput.trim();
    if (!trimmedBooth) {
      toast.error("Please enter your booth number first");
      return;
    }

    const eventZones = data?.event?.zones ?? [];
    if (eventZones.length > 0) {
      const check = validateBoothAgainstZones(trimmedBooth, eventZones);
      if (!check.valid) {
        toast.error(check.error ?? "Invalid booth number for this event");
        return;
      }
    } else if (currentEntrance === "BYOUTH" && !/^\d+[yY]$/.test(trimmedBooth)) {
      toast.error("For Byouth exit, booth number must be a number followed by Y (e.g. 1Y, 10Y, 20Y)");
      return;
    }

    if (requesting) return;
    setRequesting(true);
    const { ok, data: resData } = await fetchApi<{
      error?: string;
      ticket?: { queueNumber: number };
      entranceLabel?: string;
    }>("/api/queue/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boothNumber: trimmedBooth }),
    });
    setRequesting(false);

    if (!ok) {
      toast.error(resData.error ?? "Failed to get queue number");
      if (resData.ticket) fetchStatus();
      return;
    }

    toast.success(`Your ${resData.entranceLabel ?? "exit"} number is #${resData.ticket!.queueNumber}!`);
    fetchStatus();
  }

  const brandsBefore =
    data?.ticket && currentServing && data.ticket.status === "WAITING"
      ? Math.max(0, data.ticket.queueNumber - currentServing)
      : null;

  const brandName = data?.user?.brandName ?? session?.user?.brandName ?? "Brand";
  const rawBooth = data?.user?.boothNumber ?? session?.user?.boothNumber;
  const hasValidBooth = rawBooth && rawBooth !== "—" && rawBooth !== "N/A";
  const currentEntrance: EntranceType | null =
    data?.entranceType && isEntranceType(data.entranceType)
      ? data.entranceType
      : session?.user?.entranceType && isEntranceType(session.user.entranceType)
      ? session.user.entranceType
      : data?.entranceLabel === "Byouth"
      ? "BYOUTH"
      : data?.entranceLabel === "Bazarna"
      ? "BAZARNA"
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Welcome, {brandName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 sm:text-base">
              {hasValidBooth && (
                <>
                  Booth <span className="font-semibold text-zinc-700 dark:text-zinc-300">{rawBooth}</span>
                  {" "}·{" "}
                </>
              )}
              {data?.event ? (
                <span className="text-zinc-600 dark:text-zinc-400">{data.event.eventName}</span>
              ) : (
                <span className="text-zinc-400">No active event</span>
              )}
            </p>
            <button
              type="button"
              onClick={async () => {
                await fetchApi("/api/entrance", { method: "DELETE" });
                window.location.href = "/select-entrance";
              }}
              className="mt-1 text-sm text-orange-600 hover:underline dark:text-orange-400"
            >
              Switch to Bazarna or Byouth
            </button>
          </div>

          {currentEntrance && (
            <button
              type="button"
              onClick={async () => {
                await fetchApi("/api/entrance", { method: "DELETE" });
                window.location.href = "/select-entrance";
              }}
              title="Click to switch exit gate"
              className="group flex items-center gap-3 self-start rounded-2xl border border-zinc-200/90 bg-white p-2 pr-4 shadow-sm backdrop-blur transition-all hover:border-orange-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-orange-500 sm:self-auto"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/50 dark:bg-zinc-800 dark:ring-zinc-700/50">
                <Image
                  src={getEntranceImage(currentEntrance)}
                  alt={getEntranceLabel(currentEntrance)}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Exit Gate
                  </span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {getEntranceLabel(currentEntrance)}
                </p>
              </div>
            </button>
          )}
        </div>

        {!data?.event && (
          <Card>
            <p className="text-center text-zinc-500">
              No active {data?.entranceLabel ?? "exit"} event at the moment.
            </p>
            <p className="mt-2 text-center text-sm text-zinc-400">
              An admin must create an event for {data?.entranceLabel ?? "this exit"} in
              Settings, or switch using the button above.
            </p>
          </Card>
        )}

        {data?.event && data.eventDayPassed && !data.ticket && (
          <Card className="text-center">
            <RotateCcw className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-xl font-semibold">Previous event ended</h2>
            <p className="mt-2 text-zinc-500">
              Your old exit number was cleared. When the admin opens the next{" "}
              {data.entranceLabel} event, you can request a new number starting
              from <strong>#1</strong>.
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Last event: {data.event.eventName}
            </p>
          </Card>
        )}

        {data?.otherEntranceTicket && !data.ticket && (
          <Card className="border-orange-200 bg-orange-50/60 p-6 text-center shadow-sm dark:border-orange-900/50 dark:bg-orange-950/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-200 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <Image
                src={getEntranceImage(data.otherEntranceTicket.entranceType)}
                alt={data.otherEntranceTicket.entranceLabel}
                width={48}
                height={48}
                className="rounded-xl object-cover"
              />
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Active Number in {data.otherEntranceTicket.entranceLabel} Exit
            </h2>
            <p className="mt-2 text-base text-zinc-600 dark:text-zinc-300">
              You already requested exit number{" "}
              <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                #{data.otherEntranceTicket.queueNumber}
              </span>{" "}
              in <strong>{data.otherEntranceTicket.entranceLabel} Exit</strong>.
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Each brand can only join one exit queue. You cannot request a number in {data?.entranceLabel ?? "this exit"} while you have an active number in {data.otherEntranceTicket.entranceLabel}.
            </p>

            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                size="lg"
                onClick={async () => {
                  await fetchApi("/api/entrance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      entranceType: data.otherEntranceTicket!.entranceType,
                    }),
                  });
                  window.location.href = "/dashboard";
                }}
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Go to {data.otherEntranceTicket.entranceLabel} Ticket (#{data.otherEntranceTicket.queueNumber}) →
              </Button>
            </div>
          </Card>
        )}

        {data?.event && !data.eventDayPassed && !data.ticket && !data.otherEntranceTicket && (
          <Card className="text-center">
            {currentEntrance ? (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-orange-200/60 bg-orange-50/80 px-3.5 py-2 text-sm text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200">
                <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded">
                  <Image
                    src={getEntranceImage(currentEntrance)}
                    alt={getEntranceLabel(currentEntrance)}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xs font-medium sm:text-sm">
                  <strong className="font-semibold">{data.entranceLabel} queue only</strong> — numbers here are separate from the other exit.
                </span>
              </div>
            ) : (
              <p className="mb-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                {data.entranceLabel} queue only — numbers here are separate from the
                other exit.
              </p>
            )}
            {openTime && closeTime && (
              <p className="mb-4 text-sm text-zinc-500">
                Queue hours: {formatQueueWindow(openTime, closeTime)}
              </p>
            )}
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

            {data.windowState === "open" && (() => {
              const trimmed = boothNumberInput.trim();
              const eventZones = data.event?.zones ?? [];
              const hasEventZones = eventZones.length > 0;
              const placeholderText = getBoothPlaceholder(
                eventZones,
                currentEntrance === "BYOUTH"
              );

              let isBoothValid = false;
              let validationMessage: React.ReactNode = null;
              let isInputSuccess = false;
              let isInputError = false;

              if (hasEventZones) {
                const zoneCheck = validateBoothAgainstZones(trimmed, eventZones);
                isBoothValid = trimmed.length > 0 && zoneCheck.valid;
                isInputSuccess = isBoothValid;
                isInputError = trimmed.length > 0 && !zoneCheck.valid;

                if (isInputSuccess) {
                  validationMessage = (
                    <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Valid booth ({zoneCheck.formattedBooth})
                    </p>
                  );
                } else if (isInputError) {
                  validationMessage = (
                    <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-red-500 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {zoneCheck.error}
                    </p>
                  );
                } else {
                  validationMessage = (
                    <p className="mt-2 text-center text-xs text-zinc-400">
                      Enter booth number and zone ({placeholderText})
                    </p>
                  );
                }
              } else {
                const isByouth = currentEntrance === "BYOUTH";
                const isByouthValid = isByouth && /^\d+[yY]$/.test(trimmed);
                const isByouthInvalid = isByouth && trimmed.length > 0 && !isByouthValid;
                isBoothValid = isByouth ? isByouthValid : trimmed.length > 0;
                isInputSuccess = isByouth ? isByouthValid : false;
                isInputError = isByouth ? isByouthInvalid : false;

                if (isByouth) {
                  if (isByouthValid) {
                    validationMessage = (
                      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Valid booth ({trimmed.toUpperCase()})
                      </p>
                    );
                  } else if (isByouthInvalid) {
                    validationMessage = (
                      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-red-500 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Must be a number followed by Y (e.g. 5Y, 10Y)
                      </p>
                    );
                  } else {
                    validationMessage = (
                      <p className="mt-2 text-center text-xs text-zinc-400">
                        Must be a number followed by Y (e.g. 5Y, 10Y)
                      </p>
                    );
                  }
                } else {
                  validationMessage = (
                    <p className="mt-2 text-center text-xs text-zinc-400">
                      Make sure your booth number is accurate before requesting.
                    </p>
                  );
                }
              }

              return (
                <div className="mx-auto max-w-sm">
                  <Hash className="mx-auto h-12 w-12 text-orange-500" />
                  <h2 className="mt-4 text-xl font-semibold">
                    Queue is now open!
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Enter your booth number for this event to get your exit number
                  </p>

                  {hasEventZones && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-b from-orange-50/80 to-amber-50/30 p-3.5 shadow-sm dark:border-orange-900/40 dark:from-orange-950/40 dark:to-zinc-900/50">
                      <div className="flex items-center justify-center gap-1.5 text-orange-900 dark:text-orange-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                          Allowed Event Zones
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {eventZones.map((z) => (
                          <div
                            key={z.name}
                            className="flex items-center gap-1.5 rounded-xl border border-orange-200/70 bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-2xs backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-800/90 dark:text-zinc-100"
                          >
                            <span className="font-extrabold text-orange-600 dark:text-orange-400">
                              Zone {z.name.trim().toUpperCase()}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              1 to {z.limit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 text-left">
                    <label
                      htmlFor="booth-number"
                      className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                    >
                      Your Booth Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="booth-number"
                        type="text"
                        placeholder={placeholderText}
                        value={boothNumberInput}
                        onChange={(e) => setBoothNumberInput(e.target.value)}
                        className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-lg font-bold tracking-wide text-zinc-900 transition-all placeholder:text-sm placeholder:font-normal placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                          isInputSuccess
                            ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 focus:border-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/20"
                            : isInputError
                            ? "border-red-400 bg-red-50/20 ring-2 ring-red-500/20 focus:border-red-500 dark:border-red-500 dark:bg-red-950/20"
                            : "border-zinc-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700"
                        }`}
                        required
                      />
                      {isInputSuccess && (
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                      )}
                    </div>

                    {validationMessage}
                  </div>

                  <Button
                    className="mt-6 w-full"
                    size="lg"
                    loading={requesting}
                    disabled={!isBoothValid}
                    onClick={handleRequestNumber}
                  >
                    Get My Exit Number
                  </Button>
                </div>
              );
            })()}

            {data.windowState === "closed" && (
              <>
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                  The exit queue is now closed. Please contact the Bazarna team.
                </h2>
                {openTime && closeTime && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Queue was open {formatQueueWindow(openTime, closeTime)}
                  </p>
                )}
                <Button className="mt-6" disabled>
                  Get My Exit Number
                </Button>
              </>
            )}
          </Card>
        )}

        {data?.ticket && (
          <div className="space-y-6">
            {data.queueEndedToday && data.ticket.status !== "COMPLETED" && (
              <Card className="border-orange-200 bg-orange-50 text-center dark:border-orange-900 dark:bg-orange-950/30">
                <CalendarCheck className="mx-auto h-8 w-8 text-orange-600 dark:text-orange-400" />
                <p className="mt-2 font-medium text-orange-900 dark:text-orange-100">
                  Today&apos;s exit queue has closed
                </p>
                <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">
                  Keep your number below until you exit. Tomorrow you will get a
                  new number for the next event.
                </p>
              </Card>
            )}

            {data.ticket.status === "COMPLETED" && (
              <Card className="border-green-200 bg-green-50 text-center dark:border-green-900 dark:bg-green-950/30">
                <CalendarCheck className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
                <p className="mt-2 font-medium text-green-900 dark:text-green-100">
                  You have completed your exit
                </p>
                <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                  When the next event opens, you can request a fresh exit number.
                </p>
              </Card>
            )}
            <Card className="text-center">
              <div className="flex items-center justify-center gap-2">
                {currentEntrance && (
                  <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded">
                    <Image
                      src={getEntranceImage(currentEntrance)}
                      alt={getEntranceLabel(currentEntrance)}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  {data.entranceLabel} Exit
                </p>
              </div>
              <p className="mt-1 text-sm text-zinc-500">Your queue number</p>
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
                <p className="text-sm text-zinc-500">
                  Now Serving ({data.entranceLabel})
                </p>
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
