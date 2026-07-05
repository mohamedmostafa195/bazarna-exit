"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useSocket } from "@/hooks/use-socket";
import {
  isEntranceType,
  type EntranceType,
} from "@/lib/entrance";
import { fetchApi } from "@/lib/fetch-api";

interface DisplayData {
  event: { id: string; eventName: string; entranceType?: string } | null;
  currentServing: number | null;
  currentBrand: string | null;
  currentBooth: string | null;
  upcoming: number[];
  totalWaiting?: number;
  totalCompleted?: number;
  entranceType?: EntranceType;
}

function DisplayContent() {
  const searchParams = useSearchParams();
  const entranceParam = searchParams.get("entrance");
  const entrance: EntranceType = isEntranceType(entranceParam)
    ? entranceParam
    : "BAZARNA";

  const [data, setData] = useState<DisplayData | null>(null);
  const [pulse, setPulse] = useState(false);
  const pollUrl = `/api/display?entrance=${entrance}`;

  const accent =
    entrance === "BAZARNA"
      ? "from-orange-600 to-amber-500"
      : "from-violet-600 to-fuchsia-500";

  const fetchDisplay = useCallback(async () => {
    const { ok, data } = await fetchApi<DisplayData>(pollUrl);
    if (ok) {
      setData((prev) => {
        if (prev?.currentServing !== data.currentServing && data.currentServing) {
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
        }
        return data;
      });
    }
  }, [pollUrl]);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  const { lastUpdate } = useSocket(data?.event?.id ?? null, pollUrl);

  useEffect(() => {
    if (lastUpdate) fetchDisplay();
  }, [lastUpdate, fetchDisplay]);

  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-white">
      {/* Main — Now serving */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-10">
        <p className="mb-2 text-xl font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Now Serving
        </p>

        <div
          className={`relative transition-transform duration-500 ${pulse ? "scale-105" : "scale-100"}`}
        >
          <div
            className={`absolute -inset-4 rounded-3xl bg-gradient-to-br opacity-20 blur-2xl ${accent}`}
          />
          <p
            className={`relative bg-gradient-to-br bg-clip-text text-[10rem] font-black leading-none tracking-tight text-transparent sm:text-[14rem] ${accent}`}
          >
            {data?.currentServing ? `#${data.currentServing}` : "—"}
          </p>
        </div>

        {data?.currentBrand ? (
          <div className="mt-6 text-center">
            <p className="text-4xl font-bold text-white">{data.currentBrand}</p>
            {data.currentBooth && (
              <p className="mt-2 text-2xl text-zinc-400">Booth {data.currentBooth}</p>
            )}
            <p className="mt-4 text-lg font-medium text-orange-400">
              Please proceed to the exit →
            </p>
          </div>
        ) : (
          <p className="mt-6 text-2xl text-zinc-500">Waiting for next number…</p>
        )}
      </main>

      {/* Upcoming */}
      <section className="border-t border-zinc-800 px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Up Next
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {(data?.upcoming ?? []).length > 0 ? (
              data!.upcoming.map((num, i) => (
                <span
                  key={num}
                  className={`rounded-2xl px-8 py-4 text-4xl font-bold ${
                    i === 0
                      ? "bg-zinc-700 text-white ring-2 ring-orange-500/50"
                      : "bg-zinc-800/80 text-zinc-300"
                  }`}
                >
                  #{num}
                </span>
              ))
            ) : (
              <span className="text-xl text-zinc-600">No one waiting</span>
            )}
          </div>
        </div>
      </section>

      {/* Footer stats */}
      <footer className="flex items-center justify-center gap-10 border-t border-zinc-800 py-4 text-sm text-zinc-500">
        <span>
          Waiting:{" "}
          <strong className="text-white">{data?.totalWaiting ?? 0}</strong>
        </span>
        <span>
          Completed:{" "}
          <strong className="text-white">{data?.totalCompleted ?? 0}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Live
        </span>
      </footer>
    </div>
  );
}

export default function DisplayScreenPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center bg-zinc-950 text-white">
            Loading display…
          </div>
        }
      >
        <DisplayContent />
      </Suspense>
    </AppShell>
  );
}
