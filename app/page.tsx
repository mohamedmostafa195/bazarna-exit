import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntranceFromCookies } from "@/lib/entrance-server";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  const entrance = await getEntranceFromCookies();

  if (!entrance) {
    redirect("/select-entrance");
  }

  redirect("/dashboard");
}
