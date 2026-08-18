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
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [zone]);

  const numbers = Array.from({ length: Math.max(0, limit) }, (_, i) => i + 1);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || !zone}
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-3 text-center text-base font-bold text-zinc-900 shadow-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        id="select-number"
      >
        <span>
          {value || (zone ? "Select Number" : "Select Zone First")}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && zone && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {numbers.map((n) => {
            const boothCode = `${n}${zone}`;
            const isTaken = occupied.includes(boothCode);
            const isSelected = value === String(n);
            return (
              <li key={n}>
                <button
                  type="button"
                  disabled={isTaken}
                  onClick={() => {
                    onChange(String(n));
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    isTaken
                      ? "cursor-not-allowed text-zinc-400 line-through opacity-50 dark:text-zinc-600"
                      : isSelected
                      ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                      : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{n}</span>
                  {isTaken && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide no-underline">
                      Taken
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
