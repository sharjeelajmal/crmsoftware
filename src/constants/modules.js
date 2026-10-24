/**
 * Shop modules switched off for now (client, 2026-10-23: factory first — Sales, Customers and Recovery hidden;
 * Salesman, Analytics and Backup only show Sales data, so they are hidden with it).
 *
 * Hidden means: no sidebar link, no dashboard card or quick action, and the page URLs redirect to the dashboard
 * (src/proxy.js). Data, collections and API routes stay untouched (stock, purchases etc. keep working).
 * To bring a module back, delete its path from this list.
 */
export const HIDDEN_MODULES = Object.freeze([
  "/sales",
  "/customers",
  "/recovery",
  "/salesman",
  "/analytics",
  "/backup",
]);

/** True for a hidden module's page or any page below it ("/sales/new", "/sales/123"). */
export const isHiddenPath = (pathname) =>
  HIDDEN_MODULES.some((base) => pathname === base || pathname.startsWith(`${base}/`));

export const isModuleVisible = (path) => !isHiddenPath(path);
