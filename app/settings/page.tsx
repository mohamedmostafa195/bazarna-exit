"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { combineDateAndTime, formatDateOnlyDisplay, formatQueueWindow, formatTime, toDateInputValue, toTimeInputValue } from "@/lib/utils";
import { EntranceTabs } from "@/components/entrance-tabs";
import {
  getEntranceLabel,
  type EntranceType,
} from "@/lib/entrance";
import { Trash2 } from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingEvents, setClearingEvents] = useState(false);
  const [entrance, setEntrance] = useState<EntranceType>("BAZARNA");
  const [form, setForm] = useState({
    eventName: "",
    eventDate: "",
    queueOpenTime: "21:00",
    queueCloseTime: "23:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadFormForEntrance = useCallback(
    (allEvents: Event[], type: EntranceType) => {
      const active = allEvents.find(
        (e) => e.isActive && e.entranceType === type
      );
      if (active) {
        setEditingId(active.id);
        setForm({
          eventName: active.eventName,
          eventDate: toDateInputValue(active.eventDate),
          queueOpenTime: toTimeInputValue(new Date(active.queueOpenTime)),
          queueCloseTime: toTimeInputValue(new Date(active.queueCloseTime)),
        });
      } else {
        setEditingId(null);
        setForm({
          eventName: "",
          eventDate: toDateInputValue(new Date().toISOString()),
          queueOpenTime: "21:00",
          queueCloseTime: "23:00",
        });
      }
    },
    []
  );

  const fetchEvents = useCallback(async () => {
    const { ok, data } = await fetchApi<{ events?: Event[]; error?: string }>(
      "/api/admin/events"
    );
    if (!ok) {
      toast.error(data.error ?? "Failed to load events");
      return [];
    }
    return data.events ?? [];
  }, []);

  useEffect(() => {
    fetchEvents().then((allEvents) => {
      setEvents(allEvents);
      loadFormForEntrance(allEvents, entrance);
      setLoading(false);
    });
    // Only load once on mount; entrance changes use cached events
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEntranceChange(type: EntranceType) {
    setEntrance(type);
    loadFormForEntrance(events, type);
    fetchApi("/api/entrance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entranceType: type }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      eventName: form.eventName,
      entranceType: entrance,
      eventDate: form.eventDate,
      queueOpenAt: combineDateAndTime(form.eventDate, form.queueOpenTime),
      queueCloseAt: combineDateAndTime(form.eventDate, form.queueCloseTime),
    };

    const url = editingId
      ? `/api/admin/events/${editingId}`
      : "/api/admin/events";
    const method = editingId ? "PATCH" : "POST";

    const { ok, data } = await fetchApi<{ event?: Event; error?: string }>(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to save");
      return;
    }

    toast.success(editingId ? "Event updated" : "Event created");

    const allEvents = await fetchEvents();
    setEvents(allEvents);
    const savedId = editingId ?? data.event?.id;
    if (savedId) setEditingId(savedId);
    loadFormForEntrance(allEvents, entrance);
  }

  async function deleteEvent(id: string, eventName: string, isActive: boolean) {
    const warning = isActive
      ? `Warning: "${eventName}" is the CURRENT ACTIVE event. Deleting it will clear the active queue and tickets!\n\nAre you sure you want to delete this event?`
      : `Delete event "${eventName}"? All associated tickets will also be removed.`;

    if (!confirm(warning)) return;

    setDeletingId(id);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `/api/admin/events/${id}`,
      { method: "DELETE" }
    );
    setDeletingId(null);

    if (!ok) {
      toast.error(data.error ?? "Failed to delete event");
      return;
    }

    toast.success(`Deleted "${eventName}"`);
    const allEvents = await fetchEvents();
    setEvents(allEvents);
    loadFormForEntrance(allEvents, entrance);
  }

  async function clearPastEvents() {
    if (events.length === 0) {
      toast.error("No events to clear");
      return;
    }

    const inactiveEvents = events.filter((e) => !e.isActive);

    let onlyInactive = true;
    if (inactiveEvents.length > 0) {
      const choice = confirm(
        `Clear Events:\n\n• Click OK to clear ONLY past/inactive events (${inactiveEvents.length} event(s)).\n• Click Cancel to choose whether to delete ALL events.`
      );
      if (choice) {
        onlyInactive = true;
      } else {
        const deleteAll = confirm(
          `Do you want to permanently delete ALL ${events.length} event(s) including active ones and their queues?\n\nThis cannot be undone.`
        );
        if (!deleteAll) return;
        onlyInactive = false;
      }
    } else {
      if (
        !confirm(
          `This will permanently delete ALL ${events.length} event(s) and their queues.\n\nAre you sure?`
        )
      ) {
        return;
      }
      onlyInactive = false;
    }

    setClearingEvents(true);
    const { ok, data } = await fetchApi<{ deleted?: number; error?: string }>(
      "/api/admin/events",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: "DELETE_EVENTS",
          onlyInactive,
        }),
      }
    );
    setClearingEvents(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to clear events");
      return;
    }

    toast.success(`Cleared ${data.deleted ?? 0} event(s)`);
    const allEvents = await fetchEvents();
    setEvents(allEvents);
    loadFormForEntrance(allEvents, entrance);
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
              event date. Times use your device&apos;s local timezone.
            </p>
            {form.eventDate && form.queueOpenTime && form.queueCloseTime && (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                Queue window:{" "}
                {formatQueueWindow(
                  new Date(combineDateAndTime(form.eventDate, form.queueOpenTime)),
                  new Date(combineDateAndTime(form.eventDate, form.queueCloseTime))
                )}{" "}
                on {formatDateOnlyDisplay(form.eventDate + "T12:00:00")}
              </p>
            )}
            <Button type="submit" loading={saving}>
              {editingId ? "Update Event" : "Create Event"}
            </Button>
          </form>
        </Card>

        {events.length > 0 && (
          <Card className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Past Events
                </h2>
                <p className="text-xs text-zinc-500">
                  {events.length} event{events.length === 1 ? "" : "s"} recorded
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={clearingEvents || deletingId !== null}
                onClick={clearPastEvents}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {clearingEvents ? "Clearing..." : "Clear Events"}
              </Button>
            </div>

            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {event.eventName}
                      </p>
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {getEntranceLabel(event.entranceType as EntranceType)}
                      </span>
                      {event.isActive && (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {formatDateOnlyDisplay(event.eventDate)} ·{" "}
                      {formatTime(new Date(event.queueOpenTime))} –{" "}
                      {formatTime(new Date(event.queueCloseTime))}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === event.id || clearingEvents}
                    onClick={() =>
                      deleteEvent(event.id, event.eventName, event.isActive)
                    }
                    title={`Delete "${event.eventName}"`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
