"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { itemVariants } from "@/constants/animations";

/** Card frame used by every dashboard section: icon, title, subtitle, an optional link or action on the right. */
export function Panel({
  title,
  subtitle,
  icon: Icon,
  href,
  linkLabel = "View all",
  action,
  className = "",
  bodyClassName = "",
  testId,
  children,
}) {
  return (
    <motion.section
      variants={itemVariants}
      className={`bg-white rounded-2xl border border-border/70 shadow-soft p-4 sm:p-5 flex flex-col min-w-0 ${className}`}
      data-testid={testId}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary-soft text-primary shrink-0">
              <Icon size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 line-clamp-2">{subtitle}</p>}
          </div>
        </div>
        {action ??
          (href && (
            <Link
              href={href}
              className={
                "group inline-flex items-center gap-1 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold " +
                "text-primary hover:bg-primary-soft transition-colors"
              }
            >
              {linkLabel}
              <ArrowUpRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          ))}
      </header>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </motion.section>
  );
}

/** Friendly empty state inside a panel. */
export function PanelEmpty({ icon: Icon, title, hint }) {
  return (
    <div className="h-full min-h-32 flex flex-col items-center justify-center text-center gap-2 py-6">
      {Icon && (
        <span className="grid place-items-center w-11 h-11 rounded-full bg-surface-muted text-gray-400">
          <Icon size={20} />
        </span>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {hint && <p className="text-xs text-gray-500 max-w-60">{hint}</p>}
    </div>
  );
}

export default Panel;
