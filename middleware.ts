import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  const cookieEntrance = req.cookies.get(ENTRANCE_COOKIE)?.value;
  const hasEntrance = isEntranceType(cookieEntrance);

  const isAdminRoute =
    path.startsWith("/admin") || path.startsWith("/settings");
  const isBrandRoute = path.startsWith("/dashboard");

  if (isAdminRoute || isBrandRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!hasEntrance) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isBrandRoute && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/settings/:path*"],
};
