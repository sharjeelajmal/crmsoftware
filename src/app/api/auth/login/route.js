import { getDb } from "@/lib/mongodb";
import { publicRoute, ok, parseBody, ApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ensureBootstrapAdmin, findUserByLogin, hashPassword, passwordMatches } from "@/lib/users";
import { normalizeRole } from "@/constants/roles";

const INVALID = () => new ApiError(401, "Invalid username or password");

/** Bootstrap admin from .env — lets the owner log in before any DB user exists. */
function matchesBootstrapAdmin(username, password) {
  const envUser = process.env.FIRST_USER_NAME;
  const envPass = process.env.FIRST_USER_PASS;
  return Boolean(envUser && envPass && username === envUser && password === envPass);
}

async function authenticateDbUser(db, username, password) {
  const user = await findUserByLogin(db, username);
  if (!user?.password || user.active === false) return null;
  if (!(await passwordMatches(password, user.password))) return null;

  // Legacy plain-text password: upgrade to a hash on successful login.
  if (!user.password.startsWith("$2")) {
    await db.collection("users").updateOne({ _id: user._id }, { $set: { password: await hashPassword(password) } });
  }
  return user;
}

export const POST = publicRoute(async (request) => {
  const { username, password } = await parseBody(request, loginSchema);
  const db = await getDb();

  const user = matchesBootstrapAdmin(username, password)
    ? await ensureBootstrapAdmin(db, { name: username })
    : await authenticateDbUser(db, username, password);
  if (!user) throw INVALID();

  const session = { sub: String(user._id), name: user.name, role: normalizeRole(user.role) };
  const response = ok({ ok: true, user: { name: session.name, role: session.role } });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(session), sessionCookieOptions());
  return response;
});
