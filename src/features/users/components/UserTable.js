"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { UserRow } from "./UserRow";

export function UserTable({ users, onEdit, onResetPassword, onDelete }) {
  return (
    <>
      <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium">
        <span className="flex-grow">User</span>
        <span className="w-36 text-center">Phone</span>
        <span className="w-36 text-center">Role</span>
        <span className="w-24 text-center">Status</span>
        <span className="w-28 text-center">Created</span>
        <span className="w-32 text-center">Actions</span>
      </div>
      <motion.div variants={containerVariants} className="space-y-3">
        {users.map((user) => (
          <UserRow key={user._id} user={user} onEdit={onEdit} onResetPassword={onResetPassword} onDelete={onDelete} />
        ))}
        {users.length === 0 && <p className="text-center text-gray-500 py-8">No users found.</p>}
      </motion.div>
    </>
  );
}

export default UserTable;
