"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { Html5Qrcode } from "html5-qrcode";

interface ScannedTicket {
  id: string;
  qrToken: string;
  brandName: string;
  boothNumber: string;
  queueNumber: number;
  status: string;
  eventName: string;
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [ticket, setTicket] = useState<ScannedTicket | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const lookupTicket = useCallback(async (qrToken: string) => {
    await stopScanner();
    setLoading(true);
    setAlreadyCompleted(false);

    const { ok, data } = await fetchApi<{
      error?: string;
      ticket: ScannedTicket;
    }>(`/api/admin/scanner?token=${encodeURIComponent(qrToken)}`);
    setLoading(false);

    if (!ok) {
      toast.error(data.error ?? "Ticket not found");
      return;
    }

    setTicket(data.ticket);
    if (data.ticket.status === "COMPLETED") {
      setAlreadyCompleted(true);
    }
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    setTicket(null);
    setAlreadyCompleted(false);

    if (!containerRef.current) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const token = decodedText.includes("/ticket/")
            ? decodedText.split("/ticket/").pop()!
            : decodedText;
          lookupTicket(token);
        },
        () => {}
      );
      setScanning(true);
    } catch {
      toast.error("Could not access camera. Check permissions.");
    }
  }, [lookupTicket]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  async function handleCheckout() {
    if (!ticket) return;
    setLoading(true);

    const { ok, status, data } = await fetchApi<{
      error?: string;
      alreadyCompleted?: boolean;
      ticket: ScannedTicket;
    }>("/api/admin/scanner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: ticket.qrToken }),
    });
    setLoading(false);

    if (status === 409 && data.alreadyCompleted) {
      setAlreadyCompleted(true);
      toast.error("This brand has already completed checkout.");
      return;
    }

    if (!ok) {
      toast.error(data.error ?? "Checkout failed");
      return;
    }

    toast.success(`${data.ticket.brandName} checked out!`);
    setTicket({ ...ticket, status: "COMPLETED" });
    setAlreadyCompleted(true);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">QR Scanner</h1>

        <Card>
          <div
            id="qr-reader"
            ref={containerRef}
            className="overflow-hidden rounded-lg"
          />

          <div className="mt-4 flex gap-2">
            {!scanning ? (
              <Button onClick={startScanner} className="flex-1">
                Start Scanner
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="secondary" className="flex-1">
                Stop Scanner
              </Button>
            )}
          </div>
        </Card>

        {loading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        )}

        {ticket && (
          <Card className="mt-6">
            {alreadyCompleted ? (
              <p className="text-center font-medium text-red-600 dark:text-red-400">
                This brand has already completed checkout.
              </p>
            ) : null}

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Brand</span>
                <span className="font-semibold">{ticket.brandName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Booth</span>
                <span>{ticket.boothNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Queue #</span>
                <span className="text-xl font-bold">#{ticket.queueNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status</span>
                <StatusBadge status={ticket.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Event</span>
                <span>{ticket.eventName}</span>
              </div>
            </div>

            {!alreadyCompleted && ticket.status !== "COMPLETED" && (
              <Button
                className="mt-6 w-full"
                onClick={handleCheckout}
                loading={loading}
              >
                Mark as Checked Out
              </Button>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
