import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";

export async function requirePageAuth(role?: "ADMIN" | "BRAND" | "SCANNER") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (role && session.user.role !== role) {
    if (session.user.role === "ADMIN") {
      redirect("/admin/dashboard");
    } else if (session.user.role === "SCANNER") {
      redirect("/admin/scanner");
    } else {
      redirect("/dashboard");
    }
  }
  return session;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
