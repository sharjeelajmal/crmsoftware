"use client";

/** Pill showing whether a user may sign in. */
export function ActiveBadge({ active }) {
  const className = active
    ? "bg-success-soft text-success border-success-border"
    : "bg-danger-soft text-danger border-danger-border";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default ActiveBadge;
