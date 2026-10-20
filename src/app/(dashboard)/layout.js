"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { PROFILE_UPDATED_EVENT } from "@/constants/events";
import { api } from "@/lib/api-client";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// `role` stays null until GET /api/profile answers, so the sidebar shows nothing role-specific too early.
const DEFAULT_PROFILE = { name: BRAND.name, avatar: BRAND.logo, role: null };

/**
 * Dashboard shell.
 * - Desktop (lg+): docked sidebar that can collapse to icons.
 * - Phone/tablet: sidebar is an off-canvas drawer opened from the header's menu button.
 * - The document never scrolls; <main> is the single scroller.
 */
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  const isDesktop = useIsDesktop();
  const iconsOnly = isDesktop && collapsed;

  // Loaded once; the profile page fires PROFILE_UPDATED_EVENT after a save so the header refreshes.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .get("/api/profile")
        .then((data) => !cancelled && setProfile(data))
        .catch((err) => console.error("Failed to load profile:", err));
    load();
    window.addEventListener(PROFILE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, load);
    };
  }, []);

  // Close the drawer after navigating or when the viewport grows into desktop.
  useEffect(() => setDrawerOpen(false), [pathname, isDesktop]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col h-full min-h-0 flex-shrink-0 w-72 " +
          "bg-background lg:bg-transparent shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out " +
          `${drawerOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 ${iconsOnly ? "lg:w-20" : "lg:w-64"}`
        }
        aria-label="Sidebar"
      >
        <div className={`flex items-center h-16 pt-4 mb-2 ${iconsOnly ? "justify-center px-2" : "px-4"}`}>
          <Image src={BRAND.logo} alt={`${BRAND.name} Logo`} width={40} height={40} className="rounded-full shrink-0" />
          {!iconsOnly && <h1 className="ml-3 text-2xl font-bold text-primary whitespace-nowrap">{BRAND.name}</h1>}
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="lg:hidden ml-auto p-2 rounded-lg text-gray-500 hover:bg-white hover:text-primary transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={
            "hidden lg:flex absolute -right-3 top-24 z-20 items-center justify-center w-7 h-7 rounded-full " +
            "bg-white border border-gray-200 text-primary shadow-md transition-all duration-200 " +
            "hover:bg-primary hover:text-white hover:scale-110 cursor-pointer"
          }
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`flex-grow min-h-0 overflow-y-auto scrollbar-hidden pb-4 ${iconsOnly ? "px-2" : "px-4"}`}>
          <Sidebar collapsed={iconsOnly} role={profile.role} />
        </div>
      </aside>

      <main className="flex-grow flex flex-col p-4 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0 h-full">
        <DashboardHeader profile={profile} onOpenMenu={() => setDrawerOpen(true)} />
        <div className="flex-grow">
          {/* New page mounts immediately with a quick fade; no exit animation to wait for. */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
