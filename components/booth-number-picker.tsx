"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function BoothNumberPicker({
  zone,
  limit,
  value,
  occupied,
  disabled,
  onChange,
}: {
  zone: string;
  limit: number;
  value: string;
  occupied: string[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { setOpen(false); }, [zone]);

  const numbers = Array.from({ length: Math.max(0, limit) }, (_, i) => i + 1);

  const label = !zone ? "Select zone first"
    : disabled        ? "None available"
    : value           ? `Booth ${value}`
    :                   "Select";

  return (
    <div ref={rootRef} className="relative">
      {/* Trigger — same h-11 as the <select> next to it */}
      <button
        type="button"
        disabled={disabled || !zone}
        onClick={() => setOpen(p => !p)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`ml-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && zone && (
        <ul className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {numbers.map((n) => {
            const code       = `${n}${zone}`;
            const isTaken    = occupied.includes(code);
            const isSelected = value === String(n);
            return (
              <li key={n}>
                <button
                  type="button"
                  disabled={isTaken}
                  onClick={() => { onChange(String(n)); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                    isTaken    ? "cursor-not-allowed opacity-40"
                    : isSelected ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                    :              "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className={isTaken ? "line-through" : ""}>{n}</span>
                  {isTaken && <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Taken</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
