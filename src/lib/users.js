import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { BRAND } from "@/constants/brand";
import { ROLES, normalizeRole } from "@/constants/roles";
import { conflict, notFound } from "@/lib/api";

const USERS = "users";

/**
 * User accounts. Roles: admin (everything) and cutting_master (cutting portal only).
 * Legacy documents may carry role "Administrator" or no role; `normalizeRole` maps them to admin.
 */

export const sanitizeUser = ({ password, ...user }) => ({ ...user, role: normalizeRole(user.role) });

export const hashPassword = (password) => bcrypt.hash(password, 10);

/** True when `candidate` matches the stored password (bcrypt hash or legacy plain text). */
export async function passwordMatches(candidate, stored) {
  if (!stored) return false;
  return stored.startsWith("$2") ? bcrypt.compare(candidate, stored) : candidate === stored;
}

export const findUserById = (db, id) =>
  ObjectId.isValid(id) ? db.collection(USERS).findOne({ _id: new ObjectId(id) }) : Promise.resolve(null);

export const findUserByLogin = (db, login) =>
  db.collection(USERS).findOne({ $or: [{ name: login }, { email: login }] });

export const listUsers = (db) =>
  db
    .collection(USERS)
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: 1 })
    .toArray()
    .then((users) => users.map(sanitizeUser));

/** Creates a user; names and emails are unique logins. */
export async function createUser(db, { name, email, phone = "", password, role }) {
  const users = db.collection(USERS);
  const clash = await users.findOne({ $or: [{ name }, ...(email ? [{ email }] : [])] });
  if (clash) throw conflict("A user with this name or email already exists");

  const doc = {
    name,
    email: email || "",
    phone,
    avatar: BRAND.logo,
    role: normalizeRole(role),
    active: true,
    password: await hashPassword(password),
    createdAt: new Date(),
  };
  const { insertedId } = await users.insertOne(doc);
  return sanitizeUser({ _id: insertedId, ...doc });
}

export async function updateUser(db, id, changes) {
  const users = db.collection(USERS);
  const _id = new ObjectId(id);
  const existing = await users.findOne({ _id });
  if (!existing) throw notFound("User");

  const $set = { ...changes, updatedAt: new Date() };
  if (changes.password) $set.password = await hashPassword(changes.password);
  if (changes.role) $set.role = normalizeRole(changes.role);

  if (changes.name || changes.email) {
    const or = [];
    if (changes.name) or.push({ name: changes.name });
    if (changes.email) or.push({ email: changes.email });
    const clash = await users.findOne({ _id: { $ne: _id }, $or: or });
    if (clash) throw conflict("A user with this name or email already exists");
  }

  await users.updateOne({ _id }, { $set });
  return sanitizeUser({ ...existing, ...$set });
}

/** The last active admin can never be deleted or demoted — otherwise nobody could manage the system. */
export async function assertNotLastAdmin(db, id, { demoting = false } = {}) {
  const target = await findUserById(db, id);
  if (!target || normalizeRole(target.role) !== ROLES.ADMIN) return;
  const admins = await db
    .collection(USERS)
    .countDocuments({ _id: { $ne: target._id }, active: { $ne: false }, role: { $ne: ROLES.CUTTING_MASTER } });
  if (admins === 0)
    throw conflict(demoting ? "Cannot change the role of the last admin" : "Cannot remove the last admin");
}

/**
 * Login with the bootstrap credentials from .env. The matching admin document is created on
 * first use (or reused), so every session always points at a real user record.
 */
export async function ensureBootstrapAdmin(db, { name }) {
  const users = db.collection(USERS);
  const existing = await users.findOne({ name });
  if (existing) {
    if (normalizeRole(existing.role) !== ROLES.ADMIN || existing.role !== ROLES.ADMIN) {
      await users.updateOne({ _id: existing._id }, { $set: { role: ROLES.ADMIN } });
    }
    return { ...existing, role: ROLES.ADMIN };
  }
  // Legacy single-admin install: adopt the first (only) user as the bootstrap admin.
  const legacy = await users.findOne({});
  if (legacy && normalizeRole(legacy.role) === ROLES.ADMIN) {
    await users.updateOne({ _id: legacy._id }, { $set: { role: ROLES.ADMIN } });
    return { ...legacy, role: ROLES.ADMIN };
  }
  return createUser(db, {
    name,
    email: BRAND.email,
    password: process.env.FIRST_USER_PASS,
    role: ROLES.ADMIN,
  });
}
