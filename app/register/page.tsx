"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getEntranceImage,
  getEntranceLabel,
  type EntranceType,
} from "@/lib/entrance";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [entrance, setEntrance] = useState<EntranceType | null>(null);
  const [form, setForm] = useState({
    brandName: "",
    representativeName: "",
    boothNumber: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/entrance")
      .then((r) => r.json())
      .then((data) => {
        if (!data.entranceType) {
          router.replace("/");
          return;
        }
        setEntrance(data.entranceType);
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entrance) return;
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, entranceType: entrance }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Registration failed");
      return;
    }

    toast.success("Account created! Please sign in.");
    router.push("/login");
  }

  if (!entrance) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src={getEntranceImage(entrance)}
            alt={getEntranceLabel(entrance)}
            width={64}
            height={64}
            className="mx-auto rounded-xl object-cover"
          />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {getEntranceLabel(entrance)} Registration
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Register your brand for the exit queue
          </p>
          <Link
            href="/"
            className="mt-2 inline-block text-xs text-orange-600 hover:underline dark:text-orange-400"
          >
            Change entrance
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="space-y-4">
            <Input
              label="Brand Name"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              required
            />
            <Input
              label="Representative Name"
              value={form.representativeName}
              onChange={(e) =>
                setForm({ ...form, representativeName: e.target.value })
              }
              required
            />
            <Input
              label="Booth Number"
              value={form.boothNumber}
              onChange={(e) =>
                setForm({ ...form, boothNumber: e.target.value })
              }
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="mt-6 w-full" loading={loading}>
            Create Account
          </Button>

          <p className="mt-4 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
