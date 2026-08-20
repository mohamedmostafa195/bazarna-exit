"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/fetch-api";
import {
  ChevronRight,
  Home,
  LayoutDashboard,
  Settings,
  ScanLine,
  ListOrdered,
  LogOut,
  Activity,
  UserCog,
} from "lucide-react";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/queue", label: "Queue", icon: ListOrdered },
  { href: "/admin/actions", label: "Activity", icon: Activity },
  { href: "/admin/accounts", label: "Accounts", icon: UserCog },
  { href: "/admin/scanner", label: "Scanner", icon: ScanLine },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isBrandDashboard = !isAdmin && pathname === "/dashboard";
  const links = isAdmin ? adminLinks : [];
  const [loggingOut, setLoggingOut] = useState(false);

  if (!session) return null;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetchApi("/api/entrance", { method: "DELETE" });
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        isBrandDashboard && "hidden sm:block"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {isBrandDashboard ? (
          <div className="flex items-center gap-4">
            <Image
              src="/image/LogoBazarna.jpg"
              alt="Bazarna"
              width={36}
              height={36}
              className="rounded-lg"
              style={{ width: 36, height: 36 }}
            />
            <nav
              aria-label="Breadcrumb"
              className="hidden items-center gap-1 sm:flex"
            >
              <Link
                href="/select-entrance"
                onClick={async (e) => {
                  e.preventDefault();
                  await fetchApi("/api/entrance", { method: "DELETE" });
                  window.location.href = "/select-entrance";
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-orange-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-orange-400"
              >
                <Home className="h-3.5 w-3.5" />
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600" />
              <span className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-sm font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                Exit Queue
              </span>
            </nav>
          </div>
        ) : (
          <Link
            href="/select-entrance"
            onClick={async (e) => {
              e.preventDefault();
              await fetchApi("/api/entrance", { method: "DELETE" });
              window.location.href = "/select-entrance";
            }}
            className="flex items-center gap-2"
          >
            <Image
              src="/image/LogoBazarna.jpg"
              alt="Bazarna"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="hidden font-semibold text-zinc-900 dark:text-zinc-100 sm:inline">
              Bazarna Exit Queue
            </span>
          </Link>
        )}

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          {!isBrandDashboard && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
