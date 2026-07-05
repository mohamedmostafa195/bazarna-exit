import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActionLogs } from "@/lib/action-log";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { withApiHandler } from "@/lib/api-error";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const entrance = searchParams.get("entrance");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const entranceType =
      entrance && entrance !== "all" ? entrance : getEntranceFromRequest(request);

    const result = await getActionLogs({
      entranceType: entrance === "all" ? null : entranceType,
      page,
      limit,
    });

    return NextResponse.json(result);
  }, "GET /api/admin/actions");
}
