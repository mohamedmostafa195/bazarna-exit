import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EntranceSelector } from "@/components/entrance-selector";
import { getEntranceFromCookies } from "@/lib/entrance-server";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") redirect("/admin/dashboard");
    redirect("/dashboard");
  }

  const entrance = await getEntranceFromCookies();
  if (entrance) redirect("/login");

  return <EntranceSelector />;
}
