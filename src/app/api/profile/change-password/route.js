import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, badRequest, notFound } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";
import { findUserById, hashPassword, passwordMatches } from "@/lib/users";
import { ALL_ROLES } from "@/constants/roles";

export const POST = route(
  async (request, { session }) => {
    const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema);
    const db = await getDb();
    const user = await findUserById(db, session.sub);
    if (!user) throw notFound("User");

    if (!(await passwordMatches(currentPassword, user.password))) throw badRequest("Current password does not match");

    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { password: await hashPassword(newPassword), updatedAt: new Date() } });
    return ok({ message: "Password updated successfully!" });
  },
  { roles: ALL_ROLES }
);
