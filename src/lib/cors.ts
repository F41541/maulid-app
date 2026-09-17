/**
 * Strict Same-Origin & CORS Protection Helper
 * Maulid App is a self-contained internal management application.
 * All API routes strictly enforce same-origin access for mutations and state-changing calls.
 */

export interface CheckOriginOptions {
  origin?: string | null;
  referer?: string | null;
  secFetchSite?: string | null;
  host?: string | null;
  allowedOrigins?: string[];
}

/**
 * Checks if the given origin is trusted or matches the request host.
 */
export function isAllowedOrigin(
  origin: string | null | undefined,
  requestHost: string | null | undefined,
  extraAllowedOrigins: string[] = []
): boolean {
  if (!origin) return true; // Direct same-origin or non-browser request

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();

    // 1. Exact host match (includes domain and port)
    if (requestHost && originHost === requestHost.toLowerCase()) {
      return true;
    }

    // 2. Extra explicitly configured allowed origins (via env or runtime options)
    const envAllowed = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim().toLowerCase())
      : [];
    const allAllowed = [...envAllowed, ...extraAllowedOrigins.map((s) => s.toLowerCase())];

    for (const allowed of allAllowed) {
      if (!allowed) continue;
      if (allowed.startsWith("http://") || allowed.startsWith("https://")) {
        try {
          if (new URL(allowed).host.toLowerCase() === originHost) return true;
        } catch {
          // invalid URL in config
        }
      } else if (allowed === originHost) {
        return true;
      }
    }

    // 3. Localhost and loopback allowed in non-production environments
    if (process.env.NODE_ENV !== "production") {
      const hostname = originUrl.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates whether an incoming request exhibits forbidden cross-site attributes.
 */
export function isForbiddenCrossSite(options: CheckOriginOptions): boolean {
  const { origin, referer, secFetchSite, host, allowedOrigins = [] } = options;

  // 1. Sec-Fetch-Site explicit cross-site check
  if (secFetchSite === "cross-site") {
    return true;
  }

  // 2. Origin check if present
  if (origin && !isAllowedOrigin(origin, host, allowedOrigins)) {
    return true;
  }

  // 3. Referer check if present and origin is absent
  if (!origin && referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      if (host && refererHost !== host.toLowerCase()) {
        if (process.env.NODE_ENV !== "production") {
          const refererHostname = new URL(referer).hostname.toLowerCase();
          if (refererHostname !== "localhost" && refererHostname !== "127.0.0.1") {
            return true;
          }
        } else {
          return true;
        }
      }
    } catch {
      return true; // Malformed referer is untrusted
    }
  }

  return false;
}

/**
 * Returns strict CORS response headers for valid cross-origin or same-origin requests.
 */
export function getCorsHeaders(
  origin: string | null | undefined,
  isAllowed: boolean
): Record<string, string> {
  if (!isAllowed || !origin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}
