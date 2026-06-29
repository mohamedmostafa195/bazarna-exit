"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [entrance, setEntrance] = useState<EntranceType | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

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
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Welcome back!");
    router.push("/");
    router.refresh();
  }

  if (!entrance) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
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
            {getEntranceLabel(entrance)} Exit Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your account</p>
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
            />
          </div>

          <Button type="submit" className="mt-6 w-full" loading={loading}>
            Sign In
          </Button>

          <p className="mt-4 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
