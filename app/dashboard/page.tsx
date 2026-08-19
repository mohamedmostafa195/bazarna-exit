"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
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
import { hasUsableQueueCache, readQueueCache, writeQueueCache } from "@/lib/queue-cache";
import { CheckCircle2, AlertCircle, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { BoothNumberPicker } from "@/components/booth-number-picker";
import { DashboardBanner } from "@/components/dashboard-banner";
import {
  parseBoothNumber,
  normalizeBoothCode,
  resolveEventZones,
  validateBoothAgainstZones,
  type ZoneConfig,
} from "@/lib/booth-validation";

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
  occupiedBooths?: string[];
  entranceType?: "BAZARNA" | "BYOUTH";
  entranceLabel?: string;
  eventDayPassed?: boolean;
  queueEndedToday?: boolean;
  user: { brandName: string; boothNumber: string };
}

/* ─────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { data: session } = useSession();
  const initialCache = readQueueCache<QueueData>();
  const [data, setData]   = useState<QueueData | null>(initialCache);
  const [loading, setLoading]       = useState(() => !hasUsableQueueCache(initialCache));
  const [requesting, setRequesting] = useState(false);
  const [selectedZone,   setSelectedZone]   = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");

  /* fetch -------------------------------------------------- */
  const fetchStatus = useCallback(async () => {
    const { ok, data, status } = await fetchApi<
      QueueData & { error?: string; needsEntrance?: boolean }
    >("/api/queue/status");

    if (status === 400 && data.needsEntrance) { window.location.href = "/"; return; }
    if (ok) {
      setData(data);
      writeQueueCache(data);
      if (data.user?.boothNumber && data.user.boothNumber !== "—" && data.user.boothNumber !== "N/A") {
        const p = parseBoothNumber(data.user.boothNumber);
        if (p) { setSelectedZone(prev => prev || p.zone); setSelectedNumber(prev => prev || String(p.number)); }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { ok, data: payload, status } = await fetchApi<
        QueueData & { error?: string; needsEntrance?: boolean }
      >("/api/queue/status");

      if (cancelled) return;
      if (status === 400 && payload.needsEntrance) {
        window.location.href = "/";
        return;
      }
      if (ok) {
        setData(payload);
        writeQueueCache(payload);
        if (payload.user?.boothNumber && payload.user.boothNumber !== "—" && payload.user.boothNumber !== "N/A") {
          const p = parseBoothNumber(payload.user.boothNumber);
          if (p) {
            setSelectedZone((prev) => prev || p.zone);
            setSelectedNumber((prev) => prev || String(p.number));
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* clear occupied ----------------------------------------- */
  useEffect(() => {
    if (!selectedZone || !selectedNumber) return;
    const occ = (data?.occupiedBooths ?? []).map(b => normalizeBoothCode(b)).filter((b): b is string => !!b);
    const code = normalizeBoothCode(`${selectedNumber}${selectedZone}`);
    if (code && occ.includes(code)) setSelectedNumber("");
  }, [data?.occupiedBooths, selectedZone, selectedNumber]);

  /* socket ------------------------------------------------- */
  const { lastUpdate } = useSocket(data?.event?.id ?? null);
  useEffect(() => {
    if (!lastUpdate) return;
    setData((prev) => {
      if (!prev?.event) return prev;

      let next = prev;
      if (prev.event.currentServingNumber !== lastUpdate.currentServing) {
        next = {
          ...next,
          event: {
            ...prev.event,
            currentServingNumber: lastUpdate.currentServing,
          },
        };
      }

      const fromPoll = Array.isArray(lastUpdate.occupiedBooths)
        ? (lastUpdate.occupiedBooths as string[])
            .map((b) => normalizeBoothCode(b))
            .filter((b): b is string => !!b)
        : [];
      const fromTickets = Array.isArray(lastUpdate.tickets)
        ? (lastUpdate.tickets as { boothNumber?: string }[])
            .map((t) => normalizeBoothCode(t.boothNumber))
            .filter((b): b is string => !!b)
        : [];
      const occupied = fromPoll.length > 0 ? fromPoll : fromTickets;

      if (!prev.ticket && occupied.length > 0) {
        next = { ...next, occupiedBooths: [...new Set(occupied)] };
      }

      if (prev.ticket) {
        const up = (
          lastUpdate.tickets as { queueNumber: number; status: string }[]
        ).find((t) => t.queueNumber === prev.ticket!.queueNumber);
        if (up && up.status !== prev.ticket.status) {
          next = { ...next, ticket: { ...prev.ticket, status: up.status } };
        }
      }

      return next;
    });
  }, [lastUpdate]);

  /* derived ------------------------------------------------ */
  const openTime  = data?.event ? new Date(data.event.queueOpenTime)  : null;
  const closeTime = data?.event ? new Date(data.event.queueCloseTime) : null;
  const countdown = useCountdown(data?.windowState === "before" ? openTime : null);
  const brandName = data?.user?.brandName ?? session?.user?.brandName ?? "Brand";

  const currentEntrance: EntranceType | null =
    data?.entranceType && isEntranceType(data.entranceType)                         ? data.entranceType
    : session?.user?.entranceType && isEntranceType(session.user.entranceType)      ? session.user.entranceType
    : data?.entranceLabel === "Byouth"                                               ? "BYOUTH"
    : data?.entranceLabel === "Bazarna"                                              ? "BAZARNA"
    : null;

  const eventZones = resolveEventZones(data?.event?.zones, currentEntrance ?? data?.entranceType);


  /* actions ------------------------------------------------ */
  async function handleRequestNumber() {
    if (!selectedZone || !selectedNumber) { toast.error("Pick your zone and booth first"); return; }
    const booth = `${selectedNumber}${selectedZone}`;
    const check = validateBoothAgainstZones(booth, eventZones);
    if (!check.valid) { toast.error(check.error ?? "Invalid booth"); return; }
    if (requesting) return;
    setRequesting(true);
    const { ok, data: r } = await fetchApi<{ error?: string; ticket?: { queueNumber: number } }>(
      "/api/queue/request",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boothNumber: booth }) }
    );
    setRequesting(false);
    if (!ok) { toast.error(r.error ?? "Failed"); fetchStatus(); return; }
    toast.success(`You got exit #${r.ticket!.queueNumber}!`);
    fetchStatus();
  }

  async function switchEntrance() {
    await fetchApi("/api/entrance", { method: "DELETE" });
    window.location.href = "/select-entrance";
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  PAGE                                                   */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <AppShell>
      <DashboardBanner
        overlay={
          <button
            type="button"
            onClick={switchEntrance}
            aria-label="Back to entrance selection"
            className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/55 text-zinc-900 shadow-sm backdrop-blur-md transition-colors hover:text-orange-500 dark:border-white/10 dark:bg-zinc-900/55 dark:text-zinc-100 sm:hidden"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
          </button>
        }
      >
      <div
        className="mx-auto w-full max-w-4xl px-4 pb-16 pt-[216px] sm:px-20 sm:pt-48"
        style={{ opacity: 1, transform: "none" }}
      >
        <div className="mb-6 hidden sm:block">
          <h2 className="text-[24px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Exit Queue
          </h2>
        </div>

        {loading && (
          <p className="mb-3 text-center text-xs font-medium text-zinc-400">Updating queue…</p>
        )}

        {loading && !hasUsableQueueCache(data) && (
          <Card>
            <div className="animate-pulse space-y-5 py-2">
              <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-11 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-12 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </Card>
        )}

        {/* ════════════════════════════════════════
            STATE: no event
        ════════════════════════════════════════ */}
        {data && !data.event && !loading && !data.ticket && (
          <Card>
            <EmptyState emoji="🕐" title="No active event" sub="The admin will open the queue soon." />
          </Card>
        )}

        {/* ════════════════════════════════════════
            STATE: event day passed
        ════════════════════════════════════════ */}
        {data?.event && data.eventDayPassed && !data.ticket && (
          <Card>
            <EmptyState emoji="🔄" title="Event ended" sub="A new queue starts at #1 when the next event opens." />
          </Card>
        )}

        {/* ════════════════════════════════════════
            STATE: ticket in other entrance
        ════════════════════════════════════════ */}
        {data?.otherEntranceTicket && !data.ticket && (
          <Card>
            <div className="flex flex-col items-center py-2 text-center">
              <span className="relative h-20 w-20 overflow-hidden rounded-3xl shadow-md">
                <Image src={getEntranceImage(data.otherEntranceTicket.entranceType)} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <p className="mt-5 text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                Active Number in {data.otherEntranceTicket.entranceLabel} Exit
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                You already requested exit number{" "}
                <span className="text-3xl font-black text-orange-500">#{data.otherEntranceTicket.queueNumber}</span>{" "}
                in <strong>{data.otherEntranceTicket.entranceLabel} Exit</strong>.
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                Each brand can only join one exit queue at a time.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await fetchApi("/api/entrance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entranceType: data.otherEntranceTicket!.entranceType }) });
                  window.location.href = "/dashboard";
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-extrabold text-white transition hover:bg-orange-600 active:scale-[.98]"
              >
                Go to {data.otherEntranceTicket.entranceLabel} Ticket (#{data.otherEntranceTicket.queueNumber}) →
              </button>
            </div>
          </Card>
        )}

        {/* ════════════════════════════════════════
            STATE: queue panel (no ticket yet)
        ════════════════════════════════════════ */}
        {data?.event && !data.eventDayPassed && !data.ticket && !data.otherEntranceTicket && (
          <Card>

            {/* ── BEFORE ── */}
            {data.windowState === "before" && (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40">
                  <Clock className="h-7 w-7 text-orange-500" />
                </span>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">Opens at {formatTime(openTime!)}</p>
                {countdown && countdown.total > 0 && (
                  <div className="flex gap-2">
                    {[{l:"hr",v:countdown.hours},{l:"min",v:countdown.minutes},{l:"sec",v:countdown.seconds}].map(({l,v}) => (
                      <div key={l} className="min-w-[60px] rounded-2xl bg-zinc-100 py-3 text-center dark:bg-zinc-800">
                        <p className="text-2xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">{String(v).padStart(2,"0")}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{l}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button disabled className="w-full cursor-not-allowed rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
                  Not open yet
                </button>
              </div>
            )}

            {/* ── OPEN ── */}
            {data.windowState === "open" && (() => {
              const occ = (data.occupiedBooths ?? []).map(b => normalizeBoothCode(b)).filter((b): b is string => !!b);
              const zones = eventZones.map(z => {
                const name = z.name.trim().toUpperCase();
                let taken = 0;
                for (let n=1; n<=z.limit; n++) if (occ.includes(`${n}${name}`)) taken++;
                return { ...z, name, remaining: z.limit - taken, isFull: taken >= z.limit };
              });
              const allFull  = zones.length > 0 && zones.every(z => z.isFull);
              const zoneObj  = zones.find(z => z.name === selectedZone);
              const zoneFull = Boolean(zoneObj?.isFull);
              const code     = selectedZone && selectedNumber ? normalizeBoothCode(`${selectedNumber}${selectedZone}`) : "";
              const isTaken  = Boolean(code && occ.includes(code));
              const valid    = Boolean(selectedZone && selectedNumber && !isTaken && !zoneFull && !allFull);

              return (
                <div>
                  <div className="mb-6">
                    <p className="truncate text-[16px] font-normal leading-snug text-zinc-900 dark:text-white">
                      <span className="text-zinc-500 dark:text-zinc-400">Brand name:</span>{" "}
                      {brandName}
                    </p>
                    {data?.user?.boothNumber && data.user.boothNumber !== "—" && data.user.boothNumber !== "N/A" && (
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
                        Booth <span className="font-bold text-zinc-600 dark:text-zinc-300">{data.user.boothNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Entrance chip */}
                  {currentEntrance && (
                    <div className="mb-6 flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/50">
                      <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
                        <Image src={getEntranceImage(currentEntrance)} alt="" fill sizes="16px" className="object-cover" />
                      </span>
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400">{data.entranceLabel} queue</span>
                      <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    </div>
                  )}

                  {/* Zone + Booth */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Zone</label>
                      <select
                        value={selectedZone}
                        onChange={e => { setSelectedZone(e.target.value); setSelectedNumber(""); }}
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">Select</option>
                        {zones.map(z => (
                          <option key={z.name} value={z.name} disabled={z.isFull}>
                            Zone {z.name}{z.isFull ? " (Full)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Booth #</label>
                      <BoothNumberPicker zone={selectedZone} limit={zoneObj?.limit ?? 0} value={selectedNumber} occupied={occ} disabled={!selectedZone || zoneFull} onChange={setSelectedNumber} />
                    </div>
                  </div>

                  {/* Inline validation */}
                  <div className="mt-4 min-h-[24px]">
                    {allFull  ? <Msg error>All booths are taken</Msg>
                    : zoneFull ? <Msg error>Zone {selectedZone} is full</Msg>
                    : isTaken  ? <Msg error>Booth {selectedNumber}{selectedZone} is taken</Msg>
                    : selectedZone && selectedNumber ? <Msg>Booth <strong>{selectedNumber}{selectedZone}</strong> is available</Msg>
                    : null}
                  </div>

                  {/* Button */}
                  <button
                    type="button"
                    disabled={!valid || requesting}
                    onClick={handleRequestNumber}
                    className="relative mt-4 w-full overflow-hidden rounded-xl py-3.5 text-sm font-extrabold text-white outline-none transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#f97316 0%,#c2410c 100%)" }}
                  >
                    {requesting
                      ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Getting your number…</span>
                      : "Get My Exit Number"
                    }
                    {valid && !requesting && (
                      <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shine_2.5s_ease_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{transform:"skewX(-12deg)"}} />
                    )}
                  </button>
                </div>
              );
            })()}

            {/* ── CLOSED ── */}
            {data.windowState === "closed" && (
              <EmptyState emoji="🔒" title="Queue is closed" sub="Contact the Bazarna team for help." />
            )}
          </Card>
        )}

        {/* ════════════════════════════════════════
            STATE: ticket
        ════════════════════════════════════════ */}
        {data?.ticket && (
          <div className="space-y-3">

            {/* Queue ended today */}
            {data.queueEndedToday && data.ticket.status !== "COMPLETED" && (
              <div className="rounded-2xl border border-orange-200/50 bg-orange-50/80 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20" style={{animation:"fadeUp .3s ease both"}}>
                <p className="text-sm font-bold text-orange-700 dark:text-orange-300">Queue closed for today</p>
                <p className="text-xs text-orange-500/80">Fresh number tomorrow. Keep this one.</p>
              </div>
            )}

            {/* Completed */}
            {data.ticket.status === "COMPLETED" && (
              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20" style={{animation:"fadeUp .3s ease both"}}>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Exit complete ✓</p>
                <p className="text-xs text-emerald-500/80">See you at the next event!</p>
              </div>
            )}

            {/* ── TICKET CARD ── */}
            <div
              className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              style={{animation:"fadeUp .35s ease both"}}
            >
              {/* Brand accent bar */}
              <div className={`h-[5px] w-full ${currentEntrance === "BYOUTH" ? "bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500" : "bg-gradient-to-r from-orange-500 via-orange-600 to-red-500"}`} />

              {/* Top row */}
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-normal text-zinc-900 dark:text-zinc-100">
                    <span className="text-zinc-500 dark:text-zinc-400">Brand name:</span>{" "}
                    {brandName}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {currentEntrance && (
                      <span className="relative h-6 w-6 overflow-hidden rounded-lg">
                        <Image src={getEntranceImage(currentEntrance)} alt="" fill sizes="24px" className="object-cover" />
                      </span>
                    )}
                    <span className="truncate text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                      {data.entranceLabel} Exit
                    </span>
                  </div>
                  {data?.user?.boothNumber && data.user.boothNumber !== "—" && data.user.boothNumber !== "N/A" && (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      Booth <span className="font-bold text-zinc-600 dark:text-zinc-300">{data.user.boothNumber}</span>
                    </p>
                  )}
                </div>
                <StatusBadge status={data.ticket.status} />
              </div>

              {/* Number */}
              <div className="pb-6 pt-3 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-zinc-400">Your exit number</p>
                <p
                  className="font-black leading-none text-orange-500"
                  style={{ fontSize:"clamp(5rem,22vw,7rem)", animation:"popIn .55s cubic-bezier(.34,1.56,.64,1) both" }}
                >
                  #{data.ticket.queueNumber}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Requested at{" "}
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {formatTime(new Date(data.ticket.requestedAt))}
                  </span>
                </p>
              </div>
            </div>

            {/* ── QR CARD ── */}
            <div
              className="rounded-3xl border border-zinc-200/80 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              style={{animation:"fadeUp .45s ease both"}}
            >
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.2em] text-zinc-400">Show at exit gate</p>
              <QRDisplay value={`${typeof window !== "undefined" ? window.location.origin : ""}/ticket/${data.ticket.qrToken}`} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes popIn   { from{opacity:0;transform:scale(.55)} to{opacity:1;transform:scale(1)} }
        @keyframes shine   { 0%{transform:skewX(-12deg) translateX(-100%)} 100%{transform:skewX(-12deg) translateX(400%)} }
      `}</style>
      </DashboardBanner>
    </AppShell>
  );
}

/* ─── tiny helpers ─── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:p-10 ${className}`}
      style={{ animation: "fadeUp .35s ease both" }}
    >
      {children}
    </div>
  );
}

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-5xl leading-none">{emoji}</span>
      <div>
        <p className="font-extrabold text-zinc-800 dark:text-zinc-200">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-400">{sub}</p>
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600 active:scale-[.98] ${className}`}
    >
      {children}
    </button>
  );
}

function Msg({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold ${error ? "text-red-500" : "justify-center text-emerald-600 dark:text-emerald-400"}`}>
      {error
        ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      }
      {children}
    </p>
  );
}
