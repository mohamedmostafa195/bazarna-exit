"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { Trash2, Users, Search, RotateCcw } from "lucide-react";

interface BrandUser {
  id: string;
  brandName: string;
  representativeName: string;
  boothNumber: string;
  email: string;
  entranceType: string | null;
  ticketCount: number;
  createdAt: string;
}

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<BrandUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [resettingBoothId, setResettingBoothId] = useState<string | null>(null);
  const [resettingAllBooths, setResettingAllBooths] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { ok, data } = await fetchApi<{ users: BrandUser[] }>("/api/admin/users");
    if (ok) setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const assignedBoothsCount = users.filter(
    (u) => u.boothNumber && u.boothNumber.trim().toUpperCase() !== "N/A"
  ).length;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.brandName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.boothNumber.toLowerCase().includes(q) ||
      u.representativeName.toLowerCase().includes(q)
    );
  });

  async function resetBooth(id: string, brandName: string) {
    if (!confirm(`Reset booth number to "N/A" for "${brandName}"?`)) {
      return;
    }

    setResettingBoothId(id);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `/api/admin/users/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boothNumber: "N/A" }),
      }
    );
    setResettingBoothId(null);

    if (!ok) {
      toast.error(data.error ?? "Failed to reset booth number");
      return;
    }

    toast.success(`Reset booth for "${brandName}" to N/A`);
    fetchUsers();
  }

  async function resetAllBooths() {
    if (users.length === 0) {
      toast.error("No brand accounts found");
      return;
    }

    if (assignedBoothsCount === 0) {
      toast.info("All brand accounts already have booth number set to N/A");
      return;
    }

    if (
      !confirm(
        `This will reset booth numbers to "N/A" for all ${users.length} brand accounts (${assignedBoothsCount} currently assigned).\n\nAccount logins and brand details will NOT be deleted.\n\nAre you sure?`
      )
    ) {
      return;
    }

    setResettingAllBooths(true);
    const { ok, data } = await fetchApi<{ updated?: number; error?: string }>(
      "/api/admin/users",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_ALL_BOOTHS" }),
      }
    );
    setResettingAllBooths(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to reset booth numbers");
      return;
    }

    toast.success(`Reset booth numbers to N/A for ${data.updated ?? users.length} brand account(s)`);
    fetchUsers();
  }

  async function deleteUser(id: string, brandName: string) {
    if (!confirm(`Delete account for "${brandName}"? Their queue tickets will also be removed.`)) {
      return;
    }

    setDeletingId(id);
    const { ok, data } = await fetchApi<{ error?: string }>(
      `/api/admin/users/${id}`,
      { method: "DELETE" }
    );
    setDeletingId(null);

    if (!ok) {
      toast.error(data.error ?? "Failed to delete account");
      return;
    }

    toast.success(`Deleted ${brandName}`);
    fetchUsers();
  }

  async function deleteAllBrands() {
    if (users.length === 0) {
      toast.error("No brand accounts to delete");
      return;
    }

    if (
      !confirm(
        `This will permanently delete ALL ${users.length} brand account(s) and their queue tickets.\n\nAre you sure?`
      )
    ) {
      return;
    }

    setDeletingAll(true);
    const { ok, data } = await fetchApi<{ deleted?: number; error?: string }>(
      "/api/admin/users",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_BRANDS" }),
      }
    );
    setDeletingAll(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to delete accounts");
      return;
    }

    toast.success(`Deleted ${data.deleted} brand account(s)`);
    fetchUsers();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-7 w-7 text-orange-500" />
              Brand Accounts
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              {users.length} registered brand{users.length !== 1 ? "s" : ""} · {assignedBoothsCount} active booth{assignedBoothsCount !== 1 ? "s" : ""} · Admin accounts are not shown
            </p>
          </div>
          {users.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={resettingAllBooths}
                onClick={resetAllBooths}
                className="font-medium text-amber-500 hover:text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                <RotateCcw className="h-4 w-4" />
                Reset all booths (N/A)
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deletingAll}
                onClick={deleteAllBrands}
              >
                <Trash2 className="h-4 w-4" />
                Delete all brands
              </Button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="Search brand, email, booth..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-zinc-500">
              {search ? "No accounts match your search" : "No brand accounts yet"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-4 py-3 font-medium text-zinc-500">Brand</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Booth</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Email</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Tickets</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {filtered.map((user) => {
                    const hasBooth =
                      user.boothNumber &&
                      user.boothNumber.trim().toUpperCase() !== "N/A";

                    return (
                      <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{user.brandName}</p>
                          <p className="text-xs text-zinc-500">{user.representativeName}</p>
                        </td>
                        <td className="px-4 py-3">
                          {hasBooth ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              {user.boothNumber}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-zinc-500">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                        <td className="px-4 py-3">{user.ticketCount}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasBooth && (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={resettingBoothId === user.id}
                                onClick={() => resetBooth(user.id, user.brandName)}
                                title="Reset booth number to N/A"
                                className="text-xs text-amber-500 hover:text-amber-600 border-amber-500/30 hover:bg-amber-500/10 h-8 px-2.5"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset Booth
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deletingId === user.id}
                              onClick={() => deleteUser(user.id, user.brandName)}
                              className="h-8 px-2.5 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

