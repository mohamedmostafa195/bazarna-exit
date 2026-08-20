"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import {
  type EntranceType,
  getEntranceDescription,
  getEntranceImage,
  getEntranceLabel,
} from "@/lib/entrance";
import { writeOptimisticEntranceCache, writeQueueCache } from "@/lib/queue-cache";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { DashboardBanner } from "@/components/dashboard-banner";

export function EntranceSelector() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState<EntranceType | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectEntrance(entranceType: EntranceType) {
    if (loading) return;
    setLoading(entranceType);
    setError(null);

    const isAdmin = session?.user?.role === "ADMIN";
    const target = isAdmin ? "/admin/dashboard" : "/dashboard";

    try {
      const { ok, data, status } = await fetchApi<{ error?: string }>(
        "/api/entrance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entranceType }),
        }
      );

      if (!ok) {
        const message =
          data.error ??
          (status === 401
            ? "Your session expired. Please sign in again."
            : status === 503
              ? "Database unavailable. Try again in a moment."
              : "Could not save your selection. Please try again.");
        setError(message);
        toast.error(message);
        setLoading(null);
        return;
      }

      writeOptimisticEntranceCache(entranceType, {
        brandName: session?.user?.brandName ?? "Brand",
        boothNumber: session?.user?.boothNumber ?? "—",
      });

      void update({ entranceType });

      // Warm queue cache before navigation so dashboard opens instantly.
      if (target === "/dashboard") {
        const { ok, data: queueData } = await fetchApi<Record<string, unknown>>(
          "/api/queue/status"
        );
        if (ok) writeQueueCache(queueData);
      }

      window.location.assign(target);
    } catch {
      const message = "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
      setLoading(null);
    }
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

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/admin/dashboard");
  }, [router]);

  return (
    <DashboardBanner>
      <div dir="ltr" className="relative flex min-h-screen flex-col px-4 pb-12 pt-24 sm:px-6 sm:pt-48">
        <Image
          src="/image/LogoBazarna.jpg"
          alt="Bazarna"
          width={48}
          height={48}
          priority
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 h-12 w-12 rounded-xl shadow-sm sm:hidden"
          style={{ width: 48, height: 48 }}
        />

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/90 px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300 sm:right-6"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-start text-left sm:items-center sm:justify-center sm:text-center">
          <Image
            src="/image/LogoBazarna.jpg"
            alt="Bazarna"
            width={64}
            height={64}
            priority
            className="hidden h-16 w-16 rounded-xl sm:mx-auto sm:block"
            style={{ width: 64, height: 64 }}
          />
          <h1 className="mt-0 text-3xl font-bold text-zinc-900 sm:mt-4 dark:text-zinc-100">
            Select Your Exit Type
          </h1>
          <p className="mt-2 max-w-md text-white/90 sm:text-zinc-500 dark:sm:text-zinc-400">
            Bazarna has two separate exits. Each has its own queue numbers.
          </p>

          {error && (
            <p className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 w-full grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
          {options.map((type) => (
            <button
              key={type}
              type="button"
              disabled={loading !== null}
              onClick={() => selectEntrance(type)}
              className={cn(
                "group w-full rounded-2xl border-2 border-zinc-200 bg-white p-6 text-left shadow-sm hover:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-500 sm:p-8",
                loading === type && "border-orange-500 opacity-70",
                loading !== null && loading !== type && "opacity-60"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <div className="flex items-start gap-4">
                <Image
                  src={getEntranceImage(type)}
                  alt={getEntranceLabel(type)}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  style={{ width: 64, height: 64 }}
                />
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {getEntranceLabel(type)}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {getEntranceDescription(type)}
                  </p>
                </div>
              </div>
              <span className="mt-4 block w-full text-end text-sm font-medium text-orange-600 group-hover:underline dark:text-orange-400">
                {loading === type ? "Opening…" : "Continue →"}
              </span>
            </button>
          ))}
          </div>
        </div>
      </div>
    </DashboardBanner>
  );
}
