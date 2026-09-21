"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronDown, Search, X, Check, User } from "lucide-react";

export interface BrandUserItem {
  id: string;
  brandName: string;
  representativeName?: string | null;
  boothNumber?: string | null;
  email: string;
}

export function BrandAccountPicker({
  users,
  value,
  onChange,
  disabled,
  placeholder = "Search and select registered account...",
  activeTicketsByUserId = {},
}: {
  users: BrandUserItem[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  activeTicketsByUserId?: Record<string, number>;
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
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.brandName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.representativeName && u.representativeName.toLowerCase().includes(q)) ||
        (u.boothNumber && u.boothNumber.toLowerCase().includes(q))
    );
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === value);
  const label = selectedUser
    ? `${selectedUser.brandName} (${selectedUser.email})`
    : placeholder;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <div className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 shrink-0 text-zinc-400" />
          <span
            className={`truncate ${
              !selectedUser
                ? "font-normal text-zinc-400"
                : "font-bold text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {label}
          </span>
        </div>
        <ChevronDown
          className={`ml-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-72 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Search box inside dropdown */}
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand name, email, or rep..."
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

          {/* Accounts List */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-zinc-400">
                No matching registered accounts found
              </li>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = value === u.id;
                const activeTicketNum = activeTicketsByUserId[u.id];

                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(u.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                          : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {u.brandName}
                          {u.boothNumber && u.boothNumber !== "N/A" && (
                            <span className="ml-1.5 text-xs font-normal text-zinc-400">
                              (Booth {u.boothNumber})
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {u.email}
                          {u.representativeName ? ` • ${u.representativeName}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {activeTicketNum != null && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            #{activeTicketNum}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-4 w-4 text-orange-500 stroke-[3]" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
