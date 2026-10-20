"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { UserCircle, LogOut } from "lucide-react";
import { navForRole, navSlug } from "@/constants/navigation";
import { api } from "@/lib/api-client";

const TOOLTIP_GAP_PX = 12;

const itemClass = (active, collapsed) =>
  `relative transform transition-all duration-300 flex items-center my-1 rounded-lg cursor-pointer ${
    collapsed ? "justify-center px-3 py-2.5" : "px-3 py-2.5"
  } ${active ? "bg-primary text-white shadow-lg" : "bg-white hover:bg-gray-50 hover:shadow-xl"}`;

/**
 * Tooltip for the collapsed sidebar. Rendered through a portal on <body> at a fixed
 * position next to the hovered item, so the sidebar's scroll container can't clip it
 * and nothing can stack above it (see "Z-INDEX LAYERS" in globals.css).
 */
function SidebarTooltip({ tip }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {tip && (
        <motion.span
          key={tip.label}
          role="tooltip"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.15 }}
          style={{ top: tip.top, left: tip.left }}
          className={
            "toast-viewport pointer-events-none fixed -translate-y-1/2 px-3 py-1.5 rounded-lg bg-gray-900 " +
            "text-white text-xs font-medium whitespace-nowrap shadow-lg"
          }
        >
          {tip.label}
        </motion.span>
      )}
    </AnimatePresence>,
    document.body
  );
}

function NavItem({ as: Tag = "span", label, icon: Icon, collapsed, onShowTip, onHideTip, className, ...props }) {
  const hoverProps = collapsed
    ? {
        onMouseEnter: (e) => onShowTip(label, e.currentTarget),
        onMouseLeave: onHideTip,
        onFocus: (e) => onShowTip(label, e.currentTarget),
        onBlur: onHideTip,
      }
    : {};
  return (
    <Tag className={className} aria-label={label} {...hoverProps} {...props}>
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="ml-4 font-medium whitespace-nowrap">{label}</span>}
    </Tag>
  );
}

function SectionTitle({ children, collapsed }) {
  if (collapsed) return <div className="h-px bg-gray-200 my-3 mx-2" aria-hidden="true" />;
  return <h2 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 pl-3">{children}</h2>;
}

/** One titled group of links; renders nothing when the role has no links in it. */
function NavSection({ title, items, pathname, collapsed, itemProps }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionTitle collapsed={collapsed}>{title}</SectionTitle>
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <NavItem
              as={Link}
              href={item.path}
              label={item.name}
              icon={item.icon}
              data-testid={`nav-${navSlug(item.path)}`}
              className={itemClass(pathname === item.path, collapsed)}
              {...itemProps}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Role-aware navigation. `role` is the signed-in user's role (null until the profile has loaded). */
export function Sidebar({ collapsed = false, role = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tip, setTip] = useState(null);
  const nav = navForRole(role);

  const showTip = useCallback((label, element) => {
    const rect = element.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2, left: rect.right + TOOLTIP_GAP_PX });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  // Never leave a tooltip behind when the sidebar expands or the route changes.
  useEffect(() => setTip(null), [collapsed, pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const itemProps = { collapsed, onShowTip: showTip, onHideTip: hideTip };
  const sectionProps = { pathname, collapsed, itemProps };

  return (
    <nav
      className={`flex flex-col min-h-full bg-white text-gray-800 rounded-2xl shadow-lg ${collapsed ? "p-2" : "p-4"}`}
    >
      <SidebarTooltip tip={tip} />
      <div className="flex-grow">
        <NavSection title="Menu" items={nav.main} {...sectionProps} />
        {nav.production.length > 0 && <div className={collapsed ? "" : "mt-4"} />}
        <NavSection title="Production" items={nav.production} {...sectionProps} />
      </div>
      <div>
        <SectionTitle collapsed={collapsed}>Other</SectionTitle>
        <ul>
          <li>
            <NavItem
              as={Link}
              href="/profile"
              label="Profile"
              icon={UserCircle}
              data-testid="nav-profile"
              className={itemClass(pathname === "/profile", collapsed)}
              {...itemProps}
            />
          </li>
          <li>
            <NavItem
              as="button"
              type="button"
              onClick={handleLogout}
              label="Log Out"
              icon={LogOut}
              data-testid="nav-logout"
              className={`${itemClass(false, collapsed)} w-full text-red-600`}
              {...itemProps}
            />
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Sidebar;
