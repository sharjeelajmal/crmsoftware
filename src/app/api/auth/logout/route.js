import { publicRoute, ok } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const POST = publicRoute(async () => {
  const response = ok({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
});
