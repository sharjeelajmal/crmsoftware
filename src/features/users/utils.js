/** Pure helpers for the Users page. */

import { ALL_ROLES, ROLES, roleLabel } from "@/constants/roles";

export const MIN_PASSWORD_LENGTH = 6;

/** `{ value, label }` options for the role SelectDropdown. */
export const ROLE_OPTIONS = ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

export const EMPTY_USER_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: ROLES.CUTTING_MASTER,
  active: true,
};

/** Form state pre-filled from an existing user (passwords stay blank). */
export const userToForm = (user) => ({
  ...EMPTY_USER_FORM,
  name: user.name ?? "",
  email: user.email ?? "",
  phone: user.phone ?? "",
  role: user.role ?? ROLES.CUTTING_MASTER,
  active: user.active !== false,
});

/** Message for an invalid password pair, otherwise null. */
export const validatePasswordPair = (password, confirmPassword) => {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  if (password !== confirmPassword) return "Password and confirm password do not match.";
  return null;
};

/** Message when the add/edit form is invalid, otherwise null. `isNew` requires a password. */
export const validateUserForm = (form, isNew) => {
  if (!form.name.trim()) return "Name is required.";
  if (isNew) return validatePasswordPair(form.password, form.confirmPassword);
  return null;
};

const optional = (value) => (value.trim() ? value.trim() : undefined);

/** Body for POST /api/users. */
export const toCreatePayload = (form) => ({
  name: form.name.trim(),
  email: optional(form.email),
  phone: optional(form.phone),
  password: form.password,
  role: form.role,
});

/** Body for PUT /api/users/:id (details only; the password has its own popup). */
export const toUpdatePayload = (form) => ({
  name: form.name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  role: form.role,
  active: form.active,
});

export const countByRole = (users, role) => users.filter((user) => user.role === role).length;

/** Case-insensitive match on name, email or phone. */
export const filterUsers = (users, term) => {
  const needle = term.trim().toLowerCase();
  if (!needle) return users;
  return users.filter((user) =>
    [user.name, user.email, user.phone].some((value) => (value ?? "").toLowerCase().includes(needle))
  );
};
