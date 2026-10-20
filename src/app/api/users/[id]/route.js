import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, badRequest } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validation";
import { assertNotLastAdmin, updateUser } from "@/lib/users";
import { ROLES } from "@/constants/roles";

/** Admin only. Admins can't lock themselves out: no self-deactivation, no removing the last admin. */
export const PUT = route(async (request, { session, ...context }) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, userUpdateSchema);
  const isSelf = String(_id) === session.sub;

  if (isSelf && (changes.active === false || (changes.role && changes.role !== ROLES.ADMIN))) {
    throw badRequest("You cannot deactivate or demote your own account");
  }
  const db = await getDb();
  if (changes.active === false || (changes.role && changes.role !== ROLES.ADMIN)) {
    await assertNotLastAdmin(db, _id, { demoting: true });
  }
  return ok(await updateUser(db, _id, changes));
});

export const DELETE = route(async (_request, { session, ...context }) => {
  const _id = await requireObjectId(context);
  if (String(_id) === session.sub) throw badRequest("You cannot delete your own account");

  const db = await getDb();
  await assertNotLastAdmin(db, _id);
  const { deletedCount } = await db.collection("users").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("User");
  return ok({ deleted: true });
});
