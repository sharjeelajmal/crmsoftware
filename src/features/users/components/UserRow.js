"use client";

import { motion } from "framer-motion";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { RoleBadge } from "./RoleBadge";
import { ActiveBadge } from "./ActiveBadge";

const ICON_BUTTON_CLASS =
  "p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary-soft transition-colors cursor-pointer";

/** Small labelled value used in the phone layout (labels are a table header on md+). */
function Field({ label, children }) {
  return (
    <div className="md:hidden min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <div className="font-medium text-gray-700 break-words">{children}</div>
    </div>
  );
}

/** One user: a card on phones, a table row under the header on md+. */
export function UserRow({ user, onEdit, onResetPassword, onDelete }) {
  const created = formatDate(user.createdAt);
  return (
    <motion.div
      data-testid="user-row"
      data-user-name={user.name}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
    >
      <div className="md:flex-grow min-w-0">
        <p className="font-semibold text-gray-800 text-lg md:text-base break-words">{user.name}</p>
        <p className="text-sm text-gray-500 break-all">{user.email || "No email"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Field label="Phone">{user.phone || "—"}</Field>
        <Field label="Created">{created}</Field>
        <Field label="Role">
          <RoleBadge role={user.role} />
        </Field>
        <Field label="Status">
          <ActiveBadge active={user.active !== false} />
        </Field>
      </div>
      <span className="hidden md:block w-36 text-center text-gray-700 truncate">{user.phone || "—"}</span>
      <span className="hidden md:flex w-36 justify-center">
        <RoleBadge role={user.role} />
      </span>
      <span className="hidden md:flex w-24 justify-center">
        <ActiveBadge active={user.active !== false} />
      </span>
      <span className="hidden md:block w-28 text-center text-gray-500 text-sm">{created}</span>

      <div className="flex justify-end md:justify-center gap-1 md:w-32 border-t border-gray-100 md:border-0 pt-3 md:pt-0">
        <button
          type="button"
          data-testid="user-edit"
          onClick={() => onEdit(user)}
          className={ICON_BUTTON_CLASS}
          data-tip="Edit user"
          aria-label="Edit user"
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          data-testid="user-reset-password"
          onClick={() => onResetPassword(user)}
          className={ICON_BUTTON_CLASS}
          data-tip="Reset password"
          aria-label="Reset password"
        >
          <KeyRound size={18} />
        </button>
        <button
          type="button"
          data-testid="user-delete"
          onClick={() => onDelete(user)}
          className={`${ICON_BUTTON_CLASS} hover:text-danger hover:bg-danger-soft`}
          data-tip="Delete user"
          aria-label="Delete user"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default UserRow;
