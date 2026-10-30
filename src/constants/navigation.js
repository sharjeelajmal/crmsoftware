import {
  LayoutDashboard,
  ShoppingCart,
  Box,
  Users,
  UserCheck,
  ShoppingBag,
  DollarSign,
  BarChart2,
  RefreshCw,
  Database,
  Layers,
  UserCog,
  Scissors,
  PlusSquare,
  FileBarChart,
  BookOpen,
  Shirt,
  HardHat,
  Banknote,
  Scroll,
  ClipboardList,
  CalendarCheck,
} from "lucide-react";
import { ROLES, normalizeRole } from "@/constants/roles";
import { isModuleVisible } from "@/constants/modules";

const ADMIN = [ROLES.ADMIN];
const CUTTING = [ROLES.CUTTING_MASTER];

/**
 * Every sidebar link. `roles` lists who sees it, `section` groups it under a sidebar title
 * ("main" → "Menu", "production" → "Production"). Order here is the order on screen.
 */
export const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/", roles: ADMIN, section: "main" },
  { name: "Sales", icon: ShoppingCart, path: "/sales", roles: ADMIN, section: "main" },
  { name: "Inventory", icon: Box, path: "/inventory", roles: ADMIN, section: "main" },
  { name: "Customers", icon: Users, path: "/customers", roles: ADMIN, section: "main" },
  { name: "Salesman", icon: UserCheck, path: "/salesman", roles: ADMIN, section: "main" },
  { name: "Purchasing", icon: ShoppingBag, path: "/purchasing", roles: ADMIN, section: "main" },
  { name: "Expenses", icon: DollarSign, path: "/expenses", roles: ADMIN, section: "main" },
  { name: "Analytics", icon: BarChart2, path: "/analytics", roles: ADMIN, section: "main" },
  { name: "Recovery", icon: RefreshCw, path: "/recovery", roles: ADMIN, section: "main" },
  { name: "Backup", icon: Database, path: "/backup", roles: ADMIN, section: "main" },
  { name: "Invoices", icon: Layers, path: "/lots", roles: ADMIN, section: "production" },
  { name: "Stitching", icon: Shirt, path: "/stitching", roles: ADMIN, section: "production" },
  { name: "Invoice Report", icon: FileBarChart, path: "/lots/report", roles: ADMIN, section: "production" },
  { name: "Fabric Khata", icon: Scroll, path: "/fabric", roles: ADMIN, section: "production" },
  { name: "Cutting Report", icon: ClipboardList, path: "/fabric/report", roles: ADMIN, section: "production" },
  { name: "Ledger", icon: BookOpen, path: "/ledger", roles: ADMIN, section: "production" },
  { name: "Workers", icon: HardHat, path: "/workers", roles: ADMIN, section: "production" },
  { name: "Attendance", icon: CalendarCheck, path: "/attendance", roles: ADMIN, section: "production" },
  { name: "Wages", icon: Banknote, path: "/wages", roles: ADMIN, section: "production" },
  { name: "Users", icon: UserCog, path: "/users", roles: ADMIN, section: "production" },
  { name: "My Invoices", icon: Scissors, path: "/cutting", roles: CUTTING, section: "main" },
  { name: "New Cutting", icon: PlusSquare, path: "/cutting/new", roles: CUTTING, section: "main" },
  { name: "Fabric Khata", icon: Scroll, path: "/fabric", roles: CUTTING, section: "main" },
  { name: "Cutting Report", icon: ClipboardList, path: "/fabric/report", roles: CUTTING, section: "main" },
];

/** Admin links only (kept for callers that still want the flat list). */
export const MAIN_NAV = NAV_ITEMS.filter((item) => item.roles.includes(ROLES.ADMIN));

/** `data-testid` suffix for a nav path: "/" → "home", "/cutting/new" → "cutting-new". */
export const navSlug = (path) => (path === "/" ? "home" : path.replace(/^\/+/, "").replace(/\//g, "-"));

/**
 * Sidebar groups for a role: `{ main: [...], production: [...] }`.
 * Until the signed-in user's role is known (`role` null/undefined) both groups are empty, so a
 * cutting master never sees admin links flash before the profile has loaded.
 */
export const navForRole = (role) => {
  if (role === null || role === undefined) return { main: [], production: [] };
  const current = normalizeRole(role);
  // Hidden shop modules (src/constants/modules.js) get no sidebar link.
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(current) && isModuleVisible(item.path));
  return {
    main: visible.filter((item) => item.section === "main"),
    production: visible.filter((item) => item.section === "production"),
  };
};
