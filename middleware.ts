import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";
import { getRequestOrigin } from "@/lib/app-url";

function redirectTo(path: string, req: NextRequest) {
  return NextResponse.redirect(new URL(path, getRequestOrigin(req)));
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role?.toUpperCase();

  const cookieEntrance = req.cookies.get(ENTRANCE_COOKIE)?.value;
  const hasEntrance = isEntranceType(cookieEntrance);

  const isAdminRoute =
    path.startsWith("/admin") || path.startsWith("/settings");
  const isBrandRoute = path.startsWith("/dashboard");

  if (isAdminRoute || isBrandRoute) {
    if (!isLoggedIn) {
      return redirectTo("/login", req);
    }
    if (!hasEntrance) {
      return redirectTo("/", req);
    }
  }

  if (isAdminRoute && role !== "ADMIN") {
    return redirectTo("/dashboard", req);
  }

  if (isBrandRoute && role === "ADMIN") {
    return redirectTo("/admin/dashboard", req);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
