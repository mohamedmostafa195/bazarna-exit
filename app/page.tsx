import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EntranceSelector } from "@/components/entrance-selector";
import { getEntranceFromCookies } from "@/lib/entrance-server";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const entrance = await getEntranceFromCookies();

  if (!entrance) {
    return <EntranceSelector />;
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
