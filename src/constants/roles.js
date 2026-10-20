// User roles. Keep in sync with `userRoleSchema` in src/lib/validation.js.

export const ROLES = Object.freeze({
  ADMIN: "admin",
  CUTTING_MASTER: "cutting_master",
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: "Administrator",
  [ROLES.CUTTING_MASTER]: "Cutting Master",
});

/** Where each role lands after login (and when it opens a page it may not use). */
export const ROLE_HOME = Object.freeze({
  [ROLES.ADMIN]: "/",
  [ROLES.CUTTING_MASTER]: "/cutting",
});

/**
 * Path prefixes a cutting master may open. Everything else (sales, stock, dashboard,
 * other APIs) is blocked both by src/proxy.js and by each route's `roles` option.
 * Admin may open everything.
 */
export const CUTTING_MASTER_PATHS = Object.freeze([
  "/cutting",
  "/profile",
  "/api/lots",
  "/api/products", // read-only article list for the cutting form (route itself allows GET only)
  "/api/profile",
  "/api/auth",
]);

export const normalizeRole = (role) => (role === ROLES.CUTTING_MASTER ? ROLES.CUTTING_MASTER : ROLES.ADMIN);

export const roleLabel = (role) => ROLE_LABELS[normalizeRole(role)];

export const isPathAllowedForRole = (pathname, role) => {
  if (normalizeRole(role) === ROLES.ADMIN) return true;
  return CUTTING_MASTER_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};
