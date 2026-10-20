"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { containerVariants, itemVariants } from "@/constants/animations";
import { useUsers } from "@/features/users/hooks/useUsers";
import { filterUsers } from "@/features/users/utils";
import { UserStats } from "@/features/users/components/UserStats";
import { UserTable } from "@/features/users/components/UserTable";
import { UserFormPopup } from "@/features/users/components/UserFormPopup";
import { ResetPasswordPopup } from "@/features/users/components/ResetPasswordPopup";

const CLOSED = { type: null, user: null };

const SEARCH_INPUT_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent " +
  "focus:border-primary focus:scale-105 transition-transform duration-300";

export default function UsersPage() {
  const { users, isLoading, createUser, updateUser, resetPassword, deleteUser } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState(CLOSED);

  const closePopup = () => setPopup(CLOSED);
  // `open("add")` is used directly as an onClick handler, so the argument may be a click event:
  // only keep it when it is actually a user record.
  const open = (type) => (user) => setPopup({ type, user: user && user._id ? user : null });

  const handleSave = async (form) => {
    const ok = popup.type === "edit" ? await updateUser(popup.user._id, form) : await createUser(form);
    if (ok) closePopup();
  };

  const handleResetPassword = async (password) => {
    if (await resetPassword(popup.user._id, password)) closePopup();
  };

  const handleDelete = async () => {
    if (await deleteUser(popup.user._id)) closePopup();
  };

  const filteredUsers = filterUsers(users, searchTerm);

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "add" && <UserFormPopup onSave={handleSave} onCancel={closePopup} />}
        {popup.type === "edit" && <UserFormPopup user={popup.user} onSave={handleSave} onCancel={closePopup} />}
        {popup.type === "reset" && (
          <ResetPasswordPopup user={popup.user} onSave={handleResetPassword} onCancel={closePopup} />
        )}
        {popup.type === "delete" && (
          <ConfirmDialog
            title="Delete user?"
            message={`${popup.user.name} will no longer be able to sign in. This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={closePopup}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold">Users</h1>
          <p className="text-gray-500 mt-1">Manage who can sign in and what they can do.</p>
        </motion.div>

        <UserStats users={users} />

        <motion.div variants={itemVariants} className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={SEARCH_INPUT_CLASS}
              />
            </div>
            <Button
              size="lg"
              icon={UserPlus}
              className="w-full sm:w-auto"
              data-testid="users-add"
              onClick={open("add")}
            >
              Add User
            </Button>
          </div>
          <UserTable
            users={filteredUsers}
            onEdit={open("edit")}
            onResetPassword={open("reset")}
            onDelete={open("delete")}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
