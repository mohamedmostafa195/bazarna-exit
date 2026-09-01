"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    representativeName: "",
    email: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { ok, data } = await fetchApi<{ error?: string }>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!ok) {
      toast.error(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (login?.error) {
      toast.success("Account created! Please sign in.");
      router.replace("/login");
      return;
    }

    toast.success("Account created. Choose your exit.");
    await fetchApi("/api/entrance", { method: "DELETE" });
    router.replace("/select-entrance");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/image/LogoBazarna.jpg"
            alt="Bazarna"
            width={64}
            height={64}
            className="mx-auto rounded-xl"
          />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Brand Registration
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Register your brand for the exit queue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="space-y-4">
            <Input
              label="Brand Name"
              placeholder="e.g. Juvenile , Frenchee"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              required
            />
            <Input
              label="Representative Name"
              placeholder="e.g. Mohamed Ahmed"
              value={form.representativeName}
              onChange={(e) =>
                setForm({ ...form, representativeName: e.target.value })
              }
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
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
