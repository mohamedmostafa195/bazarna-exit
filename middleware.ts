import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";
import { getRequestOrigin } from "@/lib/app-url";

function redirectTo(path: string, req: NextRequest) {
  return NextResponse.redirect(new URL(path, getRequestOrigin(req)));
}

function resolveEntrance(
  req: NextRequest,
  sessionEntrance?: string | null
): boolean {
  const fromCookie = req.cookies.get(ENTRANCE_COOKIE)?.value;
  if (isEntranceType(fromCookie)) return true;
  return isEntranceType(sessionEntrance);
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role?.toUpperCase();

  const hasEntrance = resolveEntrance(req, req.auth?.user?.entranceType);

  const isAuthRoute = path === "/login" || path === "/register";
  const isSelectEntranceRoute = path === "/select-entrance";
  const isAdminRoute =
    path.startsWith("/admin") || path.startsWith("/settings");
  const isBrandRoute = path.startsWith("/dashboard");

  if (isAuthRoute) {
    if (isLoggedIn) {
      return redirectTo("/", req);
    }
    return NextResponse.next();
  }

  if (isSelectEntranceRoute) {
    if (!isLoggedIn) {
      return redirectTo("/login", req);
    }
    // Admins switch entrance inside the dashboard — skip this page
    if (role === "ADMIN") {
      return redirectTo("/admin/dashboard", req);
    }
    return NextResponse.next();
  }

  if (isAdminRoute || isBrandRoute) {
    if (!isLoggedIn) {
      return redirectTo("/login", req);
    }
    // Brands must pick an entrance; admins use tabs on the dashboard
    if (!hasEntrance && role !== "ADMIN") {
      return redirectTo("/select-entrance", req);
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
    "/",
    "/login",
    "/register",
    "/select-entrance",
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
