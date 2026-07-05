"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
      autoConnect: true,
      reconnection: false,
      timeout: 3000,
    });
  }
  return socket;
}

export function useSocket(
  eventId: string | null,
  pollUrl?: string | null
) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<QueueUpdateData | null>(null);
  const stopPollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (!pollUrl || stopPollingRef.current) return false;
    try {
      const res = await fetch(pollUrl, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        stopPollingRef.current = true;
        return false;
      }
      if (res.ok) {
        const data = await res.json();
        setLastUpdate({
          currentServing: data.currentServing ?? data.stats?.currentServing ?? null,
          upcoming: data.upcoming ?? data.stats?.upcoming ?? [],
          tickets: data.tickets ?? [],
          totalWaiting: data.totalWaiting ?? data.stats?.totalWaiting ?? 0,
          totalCompleted: data.totalCompleted ?? data.stats?.totalCompleted ?? 0,
        });
      }
      return true;
    } catch {
      return !stopPollingRef.current;
    }
  }, [pollUrl]);

  useEffect(() => {
    stopPollingRef.current = false;

    if (!eventId) return;

    const s = getSocket();
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const stopPollInterval = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPollInterval = () => {
      if (pollInterval || !pollUrl || stopPollingRef.current) return;
      pollInterval = setInterval(async () => {
        const shouldContinue = await poll();
        if (!shouldContinue) stopPollInterval();
      }, 5000);
    };

    const onConnect = () => {
      setConnected(true);
      stopPollInterval();
    };
    const onDisconnect = () => setConnected(false);
    const onUpdate = (data: QueueUpdateData) => setLastUpdate(data);
    const onConnectError = async () => {
      setConnected(false);
      const shouldContinue = await poll();
      if (shouldContinue) startPollInterval();
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("queue:update", onUpdate);
    s.on("connect_error", onConnectError);

    s.emit("join:event", eventId);
    setConnected(s.connected);

    if (!s.connected && pollUrl) {
      poll().then((shouldContinue) => {
        if (shouldContinue) startPollInterval();
      });
    }

    return () => {
      stopPollingRef.current = true;
      stopPollInterval();
      s.emit("leave:event", eventId);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("queue:update", onUpdate);
      s.off("connect_error", onConnectError);
    };
  }, [eventId, poll, pollUrl]);

  const refresh = useCallback(() => {
    if (eventId) {
      getSocket().emit("join:event", eventId);
    }
    poll();
  }, [eventId, poll]);

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
