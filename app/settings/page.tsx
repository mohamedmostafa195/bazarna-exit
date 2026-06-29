"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatTime } from "@/lib/utils";
import { EntranceTabs } from "@/components/entrance-tabs";
import {
  getEntranceLabel,
  type EntranceType,
} from "@/lib/entrance";

interface Event {
  id: string;
  eventName: string;
  entranceType: string;
  eventDate: string;
  queueOpenTime: string;
  queueCloseTime: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const [form, setForm] = useState({
    eventName: "",
    entranceType: "BAZARNA" as EntranceType,
    eventDate: "",
    queueOpenTime: "21:00",
    queueCloseTime: "23:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function loadFormForEntrance(allEvents: Event[], type: EntranceType) {
    const active = allEvents.find(
      (e) => e.isActive && e.entranceType === type
    );
    if (active) {
      setEditingId(active.id);
      setForm({
        eventName: active.eventName,
        entranceType: type,
        eventDate: active.eventDate.split("T")[0],
        queueOpenTime: new Date(active.queueOpenTime)
          .toTimeString()
          .slice(0, 5),
        queueCloseTime: new Date(active.queueCloseTime)
          .toTimeString()
          .slice(0, 5),
      });
    } else {
      setEditingId(null);
      setForm({
        eventName: "",
        entranceType: type,
        eventDate: "",
        queueOpenTime: "21:00",
        queueCloseTime: "23:00",
      });
    }
  }

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => {
        const allEvents = data.events ?? [];
        setEvents(allEvents);
        loadFormForEntrance(allEvents, entrance);
        setLoading(false);
      });
  }, []);

  function handleEntranceChange(type: EntranceType) {
    setEntrance(type);
    loadFormForEntrance(events, type);
    fetch("/api/entrance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entranceType: type }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = "/api/admin/events";
    const method = editingId ? "PUT" : "POST";
    const body = editingId
      ? { eventId: editingId, ...form, entranceType: entrance }
      : { ...form, entranceType: entrance };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error ?? "Failed to save");
      return;
    }

    toast.success(editingId ? "Event updated" : "Event created");
    const eventsRes = await fetch("/api/admin/events");
    const eventsData = await eventsRes.json();
    setEvents(eventsData.events ?? []);
    if (!editingId) setEditingId(data.event.id);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Event Settings</h1>

        <EntranceTabs
          value={entrance}
          onChange={handleEntranceChange}
          className="mb-6"
        />

        <Card title={`${getEntranceLabel(entrance)} Queue Time Window`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Event Name"
              value={form.eventName}
              onChange={(e) => setForm({ ...form, eventName: e.target.value })}
              required
            />
            <Input
              label="Event Date"
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Queue Opens At"
                type="time"
                value={form.queueOpenTime}
                onChange={(e) =>
                  setForm({ ...form, queueOpenTime: e.target.value })
                }
                required
              />
              <Input
                label="Queue Closes At"
                type="time"
                value={form.queueCloseTime}
                onChange={(e) =>
                  setForm({ ...form, queueCloseTime: e.target.value })
                }
                required
              />
            </div>
            <p className="text-sm text-zinc-500">
              Brands can only request exit numbers between these times on the
              event date.
            </p>
            <Button type="submit" loading={saving}>
              {editingId ? "Update Event" : "Create Event"}
            </Button>
          </form>
        </Card>

        {events.length > 0 && (
          <Card className="mt-6" title="Past Events">
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <div>
                    <p className="font-medium">
                      {event.eventName}{" "}
                      <span className="text-xs text-zinc-400">
                        ({getEntranceLabel(event.entranceType as EntranceType)})
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">
                      {new Date(event.eventDate).toLocaleDateString()} ·{" "}
                      {formatTime(new Date(event.queueOpenTime))} –{" "}
                      {formatTime(new Date(event.queueCloseTime))}
                    </p>
                  </div>
                  {event.isActive && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
