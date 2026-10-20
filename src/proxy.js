import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, isPathAllowedForRole } from "@/constants/roles";

/**
 * Auth + role gate for every page and API route (Next.js "proxy", formerly middleware).
 * - No valid session + page request        -> redirect to /login
 * - No valid session + API request         -> 401 JSON
 * - Valid session on /login                -> redirect to the role's home
 * - Role may not open this path (page)     -> redirect to the role's home
 * - Role may not open this path (API)      -> 403 JSON
 * Route handlers re-check roles themselves (defence in depth, see src/lib/api.js).
 */

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isApi = pathname.startsWith("/api/");

  if (!session && !isPublic) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session) {
    const home = ROLE_HOME[session.role] ?? "/";
    if (pathname === "/login") return NextResponse.redirect(new URL(home, request.url));
    if (!isPublic && !isPathAllowedForRole(pathname, session.role)) {
      if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
