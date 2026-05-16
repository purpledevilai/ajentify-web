import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/create-organization"];
const AUTH_PAGES = [
  "/login",
  "/sign-up",
  "/verify-email",
  "/reset-password",
  "/callback",
];

export function middleware(req: NextRequest) {
  const isAuthed = req.cookies.get("is_authenticated")?.value === "true";
  const path = req.nextUrl.pathname;

  if (
    PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) &&
    !isAuthed
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Reset-password may be visited while authenticated (e.g. via emailed link),
  // and callback must always reach the OAuth handler. Other auth pages
  // bounce to the dashboard.
  if (
    AUTH_PAGES.includes(path) &&
    isAuthed &&
    path !== "/callback" &&
    path !== "/reset-password"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static assets, and any path containing a dot
  // (favicon, images, etc).
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
