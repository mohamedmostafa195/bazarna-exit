"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export function BoothNumberPicker({
  zone,
  limit,
  value,
  occupied,
  boothBrands = {},
  disabled,
  onChange,
}: {
  zone: string;
  limit: number;
  value: string;
  occupied: string[];
  boothBrands?: Record<string, string>;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setOpen(false);
    setSearch("");
  }, [zone]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const numbers = Array.from({ length: Math.max(0, limit) }, (_, i) => i + 1);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return numbers
      .map((n) => {
        const code = `${n}${zone}`;
        const brand = boothBrands[code] || "";
        const isTaken = occupied.includes(code);
        const isSelected = value === String(n);
        return { n, code, brand, isTaken, isSelected };
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.brand.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          String(item.n).includes(q)
        );
      });
  }, [numbers, zone, boothBrands, occupied, value, search]);

  const selectedBrand = value ? boothBrands[`${value}${zone}`] : "";
  const label = !zone
    ? "Select zone first"
    : disabled
    ? "None available"
    : value
    ? selectedBrand
      ? `${selectedBrand} — Booth ${value}${zone}`
      : `Booth ${value}${zone}`
    : "Select your brand";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || !zone}
        onClick={() => setOpen((p) => !p)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`ml-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && zone && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full min-w-[280px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Search box inside dropdown */}
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand name..."
                className="h-8 w-full rounded-lg bg-zinc-100 pl-8 pr-7 text-xs font-semibold text-zinc-800 outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {filteredItems.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-zinc-400">
                No matching brands found
              </li>
            ) : (
              filteredItems.map(({ n, code, brand, isTaken, isSelected }) => (
                <li key={n}>
                  <button
                    type="button"
                    disabled={isTaken}
                    onClick={() => {
                      onChange(String(n));
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                      isTaken
                        ? "cursor-not-allowed opacity-40 bg-zinc-50/50 dark:bg-zinc-800/30"
                        : isSelected
                        ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                        : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      {/* Show ONLY the brand name in the dropdown list */}
                      <span className={`truncate font-bold text-sm ${isTaken ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                        {brand || `Booth ${code}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isTaken ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          Taken 🔒
                        </span>
                      ) : isSelected ? (
                        <Check className="h-4 w-4 text-orange-500 stroke-[3]" />
                      ) : null}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
