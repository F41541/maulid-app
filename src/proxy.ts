import { NextRequest, NextResponse } from "next/server.js";
import { isForbiddenCrossSite, getCorsHeaders } from "./lib/cors.ts";
import { verifySessionToken } from "./lib/auth-tokens.ts";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("maulid_session")?.value;
  const verifiedSession = sessionToken ? verifySessionToken(sessionToken) : null;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const secFetchSite = request.headers.get("sec-fetch-site");

  // 1. Strict CORS & Same-Origin check for all API endpoints
  if (pathname.startsWith("/api/")) {
    const isForbidden = isForbiddenCrossSite({ origin, referer, secFetchSite, host });

    // Handle preflight OPTIONS
    if (request.method === "OPTIONS") {
      if (isForbidden) {
        return new NextResponse(null, { status: 403 });
      }
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin, true),
      });
    }

    // Reject cross-origin attacks or untrusted origins
    if (isForbidden) {
      return NextResponse.json(
        { error: "Forbidden: Cross-Origin Request Blocked" },
        { status: 403 }
      );
    }
  }

  // Helper to attach CORS headers to outgoing API responses
  const applyCorsHeaders = (res: NextResponse) => {
    if (pathname.startsWith("/api/") && origin) {
      const headers = getCorsHeaders(origin, true);
      for (const [k, v] of Object.entries(headers)) {
        res.headers.set(k, v);
      }
    }
    return res;
  };

  // Allow public landing page (/), login page, api/auth, and public assets
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    if (pathname === "/login") {
      if (verifiedSession) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // Stale or invalid session cookie on login page: remove it
      if (sessionToken && !verifiedSession) {
        const res = applyCorsHeaders(NextResponse.next());
        res.cookies.delete("maulid_session");
        return res;
      }
    }
    return applyCorsHeaders(NextResponse.next());
  }

  // If session is missing or invalid on protected route
  if (!verifiedSession) {
    if (pathname.startsWith("/api/")) {
      const res = applyCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
      if (sessionToken) res.cookies.delete("maulid_session");
      return res;
    }
    const redirectRes = NextResponse.redirect(new URL("/login", request.url));
    if (sessionToken) redirectRes.cookies.delete("maulid_session");
    return redirectRes;
  }

  // Verified role from cryptographic session token
  let role = verifiedSession.role || "";
  if (role === "admin") role = "ketua_panitia";

  // Route guards
  if (pathname.startsWith("/pengguna") && role !== "ketua_panitia") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (
    pathname.startsWith("/keuangan") &&
    !["ketua_panitia", "wakil_ketua", "bendahara"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (
    (pathname.startsWith("/tamu") || pathname.startsWith("/rundown")) &&
    !["ketua_panitia", "wakil_ketua", "sekretaris"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (
    pathname.startsWith("/struktur") &&
    !["ketua_panitia", "wakil_ketua"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return applyCorsHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
