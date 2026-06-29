import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EntranceSelector } from "@/components/entrance-selector";
import { getEntranceFromCookies } from "@/lib/entrance-server";
import { isEntranceType } from "@/lib/entrance";

export default async function SelectEntrancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const entrance =
    (await getEntranceFromCookies()) ??
    (session.user.entranceType && isEntranceType(session.user.entranceType)
      ? session.user.entranceType
      : null);

  if (entrance) {
    redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
  }

  return <EntranceSelector />;
}
