"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import {
  type EntranceType,
  getEntranceDescription,
  getEntranceImage,
  getEntranceLabel,
} from "@/lib/entrance";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

export function EntranceSelector() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState<EntranceType | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function selectEntrance(entranceType: EntranceType) {
    setLoading(entranceType);
    const { ok, data } = await fetchApi<{ error?: string }>("/api/entrance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entranceType }),
    });

    if (!ok) {
      toast.error(data.error ?? "Could not save your selection. Please try again.");
      setLoading(null);
      return;
    }

    await update({ entranceType });

    const isAdmin = session?.user?.role === "ADMIN";
    router.replace(isAdmin ? "/admin/dashboard" : "/dashboard");
    router.refresh();
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetchApi("/api/entrance", { method: "DELETE" });
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/login";
    }
  }

  const options: EntranceType[] = ["BAZARNA", "BYOUTH"];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:right-6 sm:top-6"
      >
        <LogOut className="h-4 w-4" />
        {loggingOut ? "Logging out..." : "Logout"}
      </button>

      <div className="w-full max-w-2xl text-center">
        <Image
          src="/image/LogoBazarna.jpg"
          alt="Bazarna"
          width={64}
          height={64}
          className="mx-auto rounded-xl"
        />
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Select Your Exit Type
        </h1>
        <p className="mt-2 text-zinc-500">
          Bazarna has two separate exits. Each has its own queue numbers.
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
