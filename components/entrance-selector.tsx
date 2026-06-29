"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type EntranceType,
  getEntranceDescription,
  getEntranceImage,
  getEntranceLabel,
} from "@/lib/entrance";
import { cn } from "@/lib/utils";

export function EntranceSelector() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState<EntranceType | null>(null);

  async function selectEntrance(entranceType: EntranceType) {
    setLoading(entranceType);
    const res = await fetch("/api/entrance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entranceType }),
    });

    if (!res.ok) {
      toast.error("Could not save your selection. Please try again.");
      setLoading(null);
      return;
    }

    await update({ entranceType });

    const isAdmin = session?.user?.role === "ADMIN";
    router.push(isAdmin ? "/admin/dashboard" : "/dashboard");
    router.refresh();
  }

  const options: EntranceType[] = ["BAZARNA", "BYOUTH"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-2xl text-center">
        <Image
          src="/image/LogoBazarna.jpg"
          alt="Bazarna"
          width={64}
          height={64}
          className="mx-auto rounded-xl"
        />
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Select Your Entrance
        </h1>
        <p className="mt-2 text-zinc-500">
          Choose Bazarna or Byouth to enter the exit queue
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {options.map((type) => (
            <button
              key={type}
              type="button"
              disabled={loading !== null}
              onClick={() => selectEntrance(type)}
              className={cn(
                "group rounded-2xl border-2 border-zinc-200 bg-white p-8 text-left shadow-sm transition-all hover:border-orange-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-500",
                loading === type && "border-orange-500 opacity-70"
              )}
            >
              <Image
                src={getEntranceImage(type)}
                alt={getEntranceLabel(type)}
                width={80}
                height={80}
                className="mx-auto rounded-xl object-cover"
              />
              <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {getEntranceLabel(type)}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {getEntranceDescription(type)}
              </p>
              <span className="mt-6 inline-block text-sm font-medium text-orange-600 group-hover:underline dark:text-orange-400">
                {loading === type ? "Loading..." : "Continue →"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
