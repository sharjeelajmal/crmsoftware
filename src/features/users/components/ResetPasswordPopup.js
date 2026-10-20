"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { validatePasswordPair } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all";

/** Sets a new password for `user`. `onSave(password)` is awaited; the parent closes the popup on success. */
export function ResetPasswordPopup({ user, onSave, onCancel }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validatePasswordPair(password, confirmPassword);
    if (problem) {
      toast.info(problem);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(password);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onCancel} size="sm">
      <div className="text-center mb-6">
        <KeyRound className="mx-auto text-primary" size={40} />
        <h3 className="text-xl font-bold mt-3 text-gray-800">Reset Password</h3>
        <p className="text-sm text-gray-500 mt-1 break-words">{user.name}</p>
      </div>
      <form onSubmit={handleSubmit} data-testid="reset-password-form" className="space-y-4" autoComplete="off">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New Password (min 6 characters)"
          className={INPUT_CLASS}
          autoComplete="new-password"
          autoFocus
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
          className={INPUT_CLASS}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          size="lg"
          className="w-full rounded-xl"
          disabled={isSaving}
          data-testid="reset-password-submit"
        >
          {isSaving ? "Saving..." : "Set Password"}
        </Button>
      </form>
    </Modal>
  );
}

export default ResetPasswordPopup;
