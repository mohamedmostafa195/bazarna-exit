"use client";

import { useState } from "react";
import { MessageSquareText, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";

interface ExitNoteCardProps {
  ticketId?: string;
  initialNote?: string | null;
  onNoteUpdated?: (note: string | null) => void;
}

export function ExitNoteCard({
  ticketId,
  initialNote,
  onNoteUpdated,
}: ExitNoteCardProps) {
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isDirty = (initialNote ?? "") !== note.trim();

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSavedSuccess(false);

    const { ok, data } = await fetchApi<{
      error?: string;
      note?: string | null;
      success?: boolean;
    }>("/api/queue/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        note: note.trim(),
      }),
    });

    setSaving(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to send note to admin");
      return;
    }

    setSavedSuccess(true);
    toast.success(
      note.trim()
        ? "Your note was sent to the admin team!"
        : "Note cleared"
    );
    if (onNoteUpdated) {
      onNoteUpdated(data.note ?? null);
    }

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  }

  return (
    <div className="mt-3 overflow-hidden rounded-3xl border-2 border-white/50 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:border-white/50 dark:bg-zinc-900/55 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/70 pb-3 dark:border-zinc-800/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Exit Note & Feedback
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Report an issue or send a note to the admin team
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Check className="h-3 w-3" />
            Sent to Admin
          </span>
        )}
      </div>

      {/* Text Area */}
      <div className="mt-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Any issue with luggage trolley, organizer feedback, etc..."
          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white/90 p-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-100"
        />
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          disabled={saving || (!isDirty && !note.trim())}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving...
            </span>
          ) : (
            <>
              <Send className="h-3 w-3" />
              {initialNote ? "Update Note" : "Send Note"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
