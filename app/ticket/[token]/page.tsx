"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { QRDisplay } from "@/components/qr-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";

interface TicketInfo {
  ticket: {
    queueNumber: number;
    status: string;
    brandName: string;
    boothNumber: string;
    representativeName: string;
    eventName: string;
    requestedAt: string;
    calledAt: string | null;
    completedAt: string | null;
  };
  currentServing: number | null;
  brandsBefore: number;
}

export default function TicketPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<TicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ticket/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setError("Ticket not found");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("Failed to load ticket"));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-lg text-zinc-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const ticketUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/ticket/${token}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <Image
          src="/image/LogoBazarna.jpg"
          alt="Bazarna"
          width={48}
          height={48}
          className="mx-auto rounded-lg"
        />
        <p className="mt-4 text-sm text-zinc-500">{data.ticket.eventName}</p>
        <p className="font-semibold">{data.ticket.brandName}</p>
        <p className="text-xs text-zinc-400">
          Booth {data.ticket.boothNumber}
        </p>

        <p className="mt-6 text-6xl font-bold text-orange-600 dark:text-orange-400">
          #{data.ticket.queueNumber}
        </p>

        <div className="mt-4 flex justify-center">
          <StatusBadge status={data.ticket.status} />
        </div>

        <div className="mt-8 flex justify-center">
          <QRDisplay value={ticketUrl} />
        </div>

        <div className="mt-6 space-y-1 text-sm text-zinc-500">
          <p>
            Now serving:{" "}
            {data.currentServing ? `#${data.currentServing}` : "—"}
          </p>
          {data.brandsBefore > 0 && (
            <p>Brands before you: {data.brandsBefore}</p>
          )}
          <p>
            Requested: {formatTime(new Date(data.ticket.requestedAt))}
          </p>
        </div>
      </div>
    </div>
  );
}
