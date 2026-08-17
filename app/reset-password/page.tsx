"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { CheckCircle2, Lock, ArrowRight, AlertTriangle } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
          <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Invalid Reset Link
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          This password reset link is missing a valid security token.
        </p>
        <div className="mt-6">
          <Link href="/forgot-password">
            <Button className="w-full">Request a new reset link</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { ok, data } = await fetchApi<{ message?: string; error?: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      }
    );

    setLoading(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to reset password");
      return;
    }

    setSuccess(true);
    toast.success("Password reset successfully!");
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Password Reset Complete!
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Your password has been updated. You can now sign in with your new password.
        </p>

        <div className="mt-6">
          <Button onClick={() => router.push("/login")} className="w-full gap-2">
            Sign In Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="New Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
        />
      </div>

      <div>
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      {password.length > 0 && confirmPassword.length > 0 && (
        <p
          className={`text-xs font-medium ${
            password === confirmPassword
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {password === confirmPassword
            ? "✓ Passwords match"
            : "⚠ Passwords do not match"}
        </p>
      )}

      <Button
        type="submit"
        className="mt-4 w-full gap-2"
        loading={loading}
        disabled={password.length < 8 || password !== confirmPassword}
      >
        <Lock className="h-4 w-4" />
        Update Password
      </Button>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel and return to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/image/LogoBazarna.jpg"
            alt="Bazarna"
            width={64}
            height={64}
            className="mx-auto rounded-xl shadow-sm"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Set New Password
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Choose a strong password with at least 8 characters.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              </div>
            }
          >
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
