import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ENTRANCE_COOKIE, isEntranceType } from "@/lib/entrance";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  const cookieEntrance = req.cookies.get(ENTRANCE_COOKIE)?.value;
  const sessionEntrance = req.auth?.user?.entranceType;
  const hasEntrance =
    isEntranceType(cookieEntrance) ||
    (sessionEntrance && isEntranceType(sessionEntrance));

  const isAdminRoute =
    path.startsWith("/admin") || path.startsWith("/settings");
  const isBrandRoute =
    path.startsWith("/dashboard") || path.startsWith("/my-ticket");
  const isSelectEntrance = path.startsWith("/select-entrance");

  if (isSelectEntrance && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isSelectEntrance && isLoggedIn && hasEntrance) {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/admin/dashboard" : "/dashboard", req.url)
    );
  }

  if (isAdminRoute || isBrandRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!hasEntrance) {
      return NextResponse.redirect(new URL("/select-entrance", req.url));
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
  matcher: [
    "/select-entrance",
    "/dashboard/:path*",
    "/my-ticket/:path*",
    "/admin/:path*",
    "/settings/:path*",
  ],
};
