"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface QueueUpdateData {
  currentServing: number | null;
  upcoming: number[];
  tickets: unknown[];
  totalWaiting: number;
  totalCompleted: number;
}

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function useSocket(eventId: string | null) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<QueueUpdateData | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const s = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = (data: QueueUpdateData) => setLastUpdate(data);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("queue:update", onUpdate);

    s.emit("join:event", eventId);
    setConnected(s.connected);

    return () => {
      s.emit("leave:event", eventId);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("queue:update", onUpdate);
    };
  }, [eventId]);

  const refresh = useCallback(() => {
    if (eventId) {
      getSocket().emit("join:event", eventId);
    }
  }, [eventId]);

  return { connected, lastUpdate, refresh };
}

export function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, total: diff });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
