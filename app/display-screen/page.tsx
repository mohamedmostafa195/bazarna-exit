"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useSocket } from "@/hooks/use-socket";

interface DisplayData {
  event: { id: string; eventName: string } | null;
  currentServing: number | null;
  upcoming: number[];
}

export default function DisplayScreenPage() {
  const [data, setData] = useState<DisplayData | null>(null);

  const fetchDisplay = useCallback(async () => {
    const res = await fetch("/api/display");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  const { lastUpdate } = useSocket(data?.event?.id ?? null);

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
        src="/image/LogoBazarna.jpg"
        alt="Bazarna"
        width={80}
        height={80}
        className="mb-6 rounded-xl"
      />

      <p className="text-xl text-zinc-400">
        {data?.event?.eventName ?? "Bazarna Exit Queue"}
      </p>

      <div className="mt-12 text-center">
        <p className="text-2xl font-medium uppercase tracking-widest text-orange-400">
          Now Serving
        </p>
        <p className="mt-4 text-[12rem] font-bold leading-none text-white">
          {data?.currentServing ? `#${data.currentServing}` : "—"}
        </p>
      </div>

      <div className="mt-16 w-full max-w-2xl">
        <p className="mb-6 text-center text-xl font-medium uppercase tracking-widest text-zinc-400">
          Upcoming Numbers
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
