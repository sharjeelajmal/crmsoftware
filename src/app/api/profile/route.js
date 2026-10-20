import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, notFound } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validation";
import { findUserById, sanitizeUser, updateUser } from "@/lib/users";
import { ALL_ROLES } from "@/constants/roles";

/** The signed-in user's own profile (any role). */
export const GET = route(
  async (_request, { session }) => {
    const db = await getDb();
    const user = await findUserById(db, session.sub);
    if (!user) throw notFound("User");
    return ok(sanitizeUser(user));
  },
  { roles: ALL_ROLES }
);

export const PUT = route(
  async (request, { session }) => {
    const changes = await parseBody(request, profileUpdateSchema);
    const db = await getDb();
    await updateUser(db, session.sub, changes);
    return ok({ message: "Profile updated successfully!" });
  },
  { roles: ALL_ROLES }
);
