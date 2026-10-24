"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Calculator as CalculatorIcon,
  PackagePlus,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { greetingFor } from "@/constants/dashboard";
import { isModuleVisible } from "@/constants/modules";

const PILL =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer";
const PRIMARY = `${PILL} bg-primary text-white shadow-brand hover:bg-primary-hover hover:-translate-y-0.5`;
const SECONDARY = `${PILL} bg-white text-gray-700 border border-border/70 shadow-soft hover:text-primary hover:border-primary/30 hover:-translate-y-0.5`;

// Shortcuts into other pages; links into hidden modules (src/constants/modules.js) are left out.
const LINKS = [
  { href: "/cutting/new", label: "New cutting entry", icon: Plus, primary: true },
  { href: "/stitching", label: "Gate pass out", icon: Truck },
  { href: "/purchasing", label: "New purchase", icon: ShoppingBag },
  { href: "/sales/new", label: "New sale", icon: ShoppingCart },
].filter((link) => isModuleVisible(link.href));

/** Greeting, live status with a manual refresh, and the quick actions. */
export function WelcomeBar({ name, generatedAt, isRefreshing, onRefresh, onAddItem, onCalculator }) {
  const now = new Date();

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"
      data-testid="dash-welcome"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{format(now, "EEEE, d MMMM yyyy")}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {greetingFor(now)}
          {name ? `, ${name}` : ""}
        </h1>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
          <span className="relative flex w-2 h-2" aria-hidden="true">
            <span className="absolute inline-flex w-full h-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
          </span>
          <span>
            Live factory overview · updated{" "}
            <span data-testid="dash-updated">{generatedAt ? format(new Date(generatedAt), "h:mm a") : "—"}</span>
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh dashboard"
            className="grid place-items-center w-7 h-7 rounded-lg text-gray-500 hover:bg-white hover:text-primary transition-colors cursor-pointer disabled:cursor-default"
            data-testid="dash-refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2" data-testid="quick-actions">
        {LINKS.map(({ href, label, icon: Icon, primary }) => (
          <Link key={href} href={href} className={primary ? `${PRIMARY} col-span-2` : SECONDARY}>
            <Icon size={16} /> {label}
          </Link>
        ))}
        <button type="button" onClick={onAddItem} className={SECONDARY} data-testid="dash-add-item">
          <PackagePlus size={16} /> Add item
        </button>
        <button
          type="button"
          onClick={onCalculator}
          className={SECONDARY}
          aria-label="Calculator"
          data-testid="dash-calculator"
        >
          <CalculatorIcon size={16} />
          <span className="sm:hidden">Calculator</span>
        </button>
      </div>
    </motion.div>
  );
}

export default WelcomeBar;
