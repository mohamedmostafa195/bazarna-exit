"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { ArrowLeft, MailCheck, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    const { ok, data } = await fetchApi<{ message?: string; error?: string }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }
    );

    setLoading(false);

    if (!ok) {
      toast.error(data.error ?? "Failed to send reset link");
      return;
    }

    setSubmitted(true);
    toast.success("Reset link sent!");
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
            className="mx-auto rounded-xl shadow-sm"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Forgot Password?
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            No worries, we will send you reset instructions.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/40">
                <MailCheck className="h-7 w-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                If an account exists for{" "}
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {email}
                </strong>
                , you will receive a password reset link shortly.
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                Please check your spam or promotions folder if you don&apos;t see it.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                  }}
                  className="w-full"
                >
                  Try another email
                </Button>
                <Link href="/login" className="w-full">
                  <Button className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Registered Email"
                  type="email"
                  placeholder="name@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="mt-4 w-full gap-2" loading={loading}>
                <Mail className="h-4 w-4" />
                Send Reset Link
              </Button>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
