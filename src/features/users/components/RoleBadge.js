"use client";

import { ROLES, roleLabel } from "@/constants/roles";

const CLASS_BY_ROLE = {
  [ROLES.ADMIN]: "bg-primary-soft text-primary",
  [ROLES.CUTTING_MASTER]: "bg-gray-100 text-gray-700",
};

/** Pill showing a user's role label. */
export function RoleBadge({ role }) {
  const className = CLASS_BY_ROLE[role] ?? CLASS_BY_ROLE[ROLES.ADMIN];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}

export default RoleBadge;
