import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_AFTER_LOGIN, SESSION_COOKIE } from "@/lib/auth";

/**
 * Demo route protection: app pages need the demo session cookie, and signed-in
 * visitors skip the login page. This is an optimistic check, not real security.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL(DEFAULT_AFTER_LOGIN, request.url)) : NextResponse.next();
  }

  if (!signedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/students/:path*",
    "/risks/:path*",
    "/segments/:path*",
    "/interventions/:path*",
    "/data/:path*",
  ],
};
