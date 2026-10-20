import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody } from "@/lib/api";
import { userCreateSchema } from "@/lib/validation";
import { createUser, listUsers } from "@/lib/users";

/** Admin only: user accounts (admins and cutting masters). */
export const GET = route(async () => {
  const db = await getDb();
  return ok(await listUsers(db));
});

export const POST = route(async (request) => {
  const input = await parseBody(request, userCreateSchema);
  const db = await getDb();
  return created(await createUser(db, input));
});
