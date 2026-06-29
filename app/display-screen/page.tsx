"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/use-socket";
import {
  getEntranceImage,
  getEntranceLabel,
  isEntranceType,
  type EntranceType,
} from "@/lib/entrance";

interface DisplayData {
  event: { id: string; eventName: string; entranceType?: string } | null;
  currentServing: number | null;
  upcoming: number[];
  entranceType?: EntranceType;
}

function DisplayContent() {
  const searchParams = useSearchParams();
  const entranceParam = searchParams.get("entrance");
  const entrance: EntranceType = isEntranceType(entranceParam)
    ? entranceParam
    : "BAZARNA";

  const [data, setData] = useState<DisplayData | null>(null);
  const pollUrl = `/api/display?entrance=${entrance}`;

  const fetchDisplay = useCallback(async () => {
    const res = await fetch(pollUrl);
    if (res.ok) setData(await res.json());
  }, [pollUrl]);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  const { lastUpdate } = useSocket(data?.event?.id ?? null, pollUrl);

  useEffect(() => {
    if (lastUpdate) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              currentServing: lastUpdate.currentServing,
              upcoming: lastUpdate.upcoming,
            }
          : prev
      );
    }
  }, [lastUpdate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-8 py-12 text-white">
      <Image
        src={getEntranceImage(entrance)}
        alt={getEntranceLabel(entrance)}
        width={80}
        height={80}
        className="mb-6 rounded-xl object-cover"
      />

      <p className="text-3xl font-bold text-white">
        {getEntranceLabel(entrance)} Exit
      </p>
      <p className="mt-1 text-lg text-zinc-500">
        {data?.event?.eventName ?? "Separate queue — not shared with the other exit"}
      </p>

      <div className="mt-12 text-center">
        <p className="text-2xl font-medium uppercase tracking-widest text-orange-400">
          {getEntranceLabel(entrance)} — Now Serving
        </p>
        <p className="mt-4 text-[12rem] font-bold leading-none text-white">
          {data?.currentServing ? `#${data.currentServing}` : "—"}
        </p>
      </div>

      <div className="mt-16 w-full max-w-2xl">
        <p className="mb-6 text-center text-xl font-medium uppercase tracking-widest text-zinc-400">
          {getEntranceLabel(entrance)} — Upcoming
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {(data?.upcoming ?? []).length > 0 ? (
            data!.upcoming.map((num) => (
              <span
                key={num}
                className="rounded-2xl bg-zinc-800 px-8 py-4 text-5xl font-bold"
              >
                #{num}
              </span>
            ))
          ) : (
            <span className="text-2xl text-zinc-500">No upcoming numbers</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DisplayScreenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          Loading...
        </div>
      }
    >
      <DisplayContent />
    </Suspense>
  );
}
