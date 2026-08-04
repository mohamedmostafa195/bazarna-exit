import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntranceFromCookies } from "@/lib/entrance-server";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const entrance = await getEntranceFromCookies();

  if (!entrance) {
    redirect("/select-entrance");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
