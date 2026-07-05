"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { Trash2, Users, Search } from "lucide-react";

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

  const fetchUsers = useCallback(async () => {
    const { ok, data } = await fetchApi<{ users: BrandUser[] }>("/api/admin/users");
    if (ok) setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.brandName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.boothNumber.toLowerCase().includes(q) ||
      u.representativeName.toLowerCase().includes(q)
    );
  });

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

    const typed = prompt(
      `This will permanently delete ALL ${users.length} brand account(s) and their queue tickets.\n\nType DELETE to confirm:`
    );
    if (typed !== "DELETE") return;

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
            <p className="text-zinc-500">
              {users.length} registered brand{users.length !== 1 ? "s" : ""} · Admin accounts are not shown
            </p>
          </div>
          {users.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              loading={deletingAll}
              onClick={deleteAllBrands}
            >
              <Trash2 className="h-4 w-4" />
              Delete all brands
            </Button>
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
                    <th className="px-4 py-3 font-medium text-zinc-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{user.brandName}</p>
                        <p className="text-xs text-zinc-500">{user.representativeName}</p>
                      </td>
                      <td className="px-4 py-3">{user.boothNumber}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.ticketCount}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deletingId === user.id}
                          onClick={() => deleteUser(user.id, user.brandName)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
