"use client";

import { cn } from "@/lib/utils";
import {
  ENTRANCE_TYPES,
  getEntranceLabel,
  type EntranceType,
} from "@/lib/entrance";

interface EntranceTabsProps {
  value: EntranceType;
  onChange: (value: EntranceType) => void;
  className?: string;
}

export function EntranceTabs({ value, onChange, className }: EntranceTabsProps) {
  return (
    <div className={cn("flex gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800", className)}>
      {ENTRANCE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            value === type
              ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-900 dark:text-orange-300"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          )}
        >
          {getEntranceLabel(type)}
        </button>
      ))}
    </div>
  );
}
