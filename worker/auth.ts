import { verifyToken } from "@clerk/backend";

export interface ClerkAuthEnv {
  CLERK_SECRET_KEY?: string;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Validates a Clerk session JWT from the Authorization header.
 * Returns the Clerk user ID (JWT `sub`) or a Response to return to the client.
 */
export async function requireClerkUserId(request: Request, env: ClerkAuthEnv): Promise<string | Response> {
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return jsonError("Auth is not configured", 503);
  }

  const token = bearerToken(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: authorizedPartiesForRequest(request)
    });
    const userId = payload.sub;
    if (!userId) {
      return jsonError("Unauthorized", 401);
    }
    return userId;
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

function authorizedPartiesForRequest(request: Request): string[] {
  const url = new URL(request.url);
  const parties = new Set<string>([`${url.protocol}//${url.host}`]);
  const origin = request.headers.get("Origin");
  if (origin) parties.add(origin);
  return Array.from(parties);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" }
  });
}
