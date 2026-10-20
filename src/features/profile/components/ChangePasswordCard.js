"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { PasswordInputField } from "./PasswordInputField";
import { EMPTY_PASSWORD_FORM } from "../utils";

/** Current / new / confirm password form. `onSubmit(form)` resolves true when the password was changed. */
export function ChangePasswordCard({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (await onSubmit(form)) setForm(EMPTY_PASSWORD_FORM);
  };

  return (
    <motion.div variants={itemVariants} className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
      <div className="space-y-4">
        <PasswordInputField
          icon={Lock}
          placeholder="Current Password"
          name="currentPassword"
          value={form.currentPassword}
          onChange={handleChange}
        />
        <PasswordInputField
          icon={Lock}
          placeholder="New Password"
          name="newPassword"
          value={form.newPassword}
          onChange={handleChange}
        />
        <PasswordInputField
          icon={Lock}
          placeholder="Confirm New Password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
        />
      </div>
      <div className="flex justify-end mt-6">
        <Button size="lg" icon={ShieldCheck} onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </motion.div>
  );
}

export default ChangePasswordCard;
