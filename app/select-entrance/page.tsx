import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EntranceSelector } from "@/components/entrance-selector";

export default async function SelectEntrancePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return <EntranceSelector />;
}
