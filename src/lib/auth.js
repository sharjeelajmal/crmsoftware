import { SignJWT, jwtVerify } from "jose";
import { normalizeRole } from "@/constants/roles";

/**
 * Session handling: a signed JWT in an HttpOnly cookie.
 * The browser can't read or forge it; `src/proxy.js` verifies it on every request
 * and route handlers receive it as `context.session` (see src/lib/api.js).
 *
 * Session shape: { sub: userId, name, role }
 */

export const SESSION_COOKIE = "aj_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const ALGORITHM = "HS256";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set in .env and be at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

/** @param {{ sub: string, name: string, role: string }} user */
export async function createSessionToken(user) {
  return new SignJWT({ name: user.name, role: normalizeRole(user.role) })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(user.sub))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** @returns {Promise<{ sub: string, name: string, role: string } | null>} */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALGORITHM] });
    return { sub: payload.sub, name: payload.name, role: normalizeRole(payload.role) };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Reads the current session from a Next.js request (route handlers / proxy). */
export async function getSession(request) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export const hasRole = (session, roles) => Boolean(session && roles.includes(normalizeRole(session.role)));
