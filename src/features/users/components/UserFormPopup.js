"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_USER_FORM, ROLE_OPTIONS, userToForm, validateUserForm } from "../utils";
import { Switch } from "@/components/ui/Switch";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all";

/** On/off switch for the "active" flag (edit mode only). */
function ActiveToggle({ checked, onChange }) {
  return (
    <Switch
      label={checked ? "Active" : "Inactive"}
      description={checked ? "Can sign in" : "Sign-in blocked"}
      checked={checked}
      onChange={onChange}
      testId="user-form-active"
    />
  );
}

/**
 * Add / edit user form. With `user` it edits (no password fields, active toggle shown);
 * without, it creates. `onSave(form)` is awaited; the parent closes the popup on success.
 */
export function UserFormPopup({ user = null, onSave, onCancel }) {
  const toast = useToast();
  const isNew = !user;
  const [form, setForm] = useState(() => (user ? userToForm(user) : EMPTY_USER_FORM));
  const [isSaving, setIsSaving] = useState(false);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validateUserForm(form, isNew);
    if (problem) {
      toast.info(problem);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onCancel} size="lg">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">{isNew ? "Add New User" : "Edit User"}</h3>
      <form noValidate onSubmit={handleSubmit} data-testid="user-form" className="space-y-4" autoComplete="off">
        <input
          autoComplete="off"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
          className={INPUT_CLASS}
          autoFocus
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            autoComplete="off"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email (optional)"
            className={INPUT_CLASS}
          />
          <input
            autoComplete="off"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone (optional)"
            className={INPUT_CLASS}
          />
        </div>
        {isNew && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password (min 6 characters)"
              className={INPUT_CLASS}
              autoComplete="new-password"
            />
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              className={INPUT_CLASS}
              autoComplete="new-password"
            />
          </div>
        )}
        <div className={`grid grid-cols-1 ${isNew ? "" : "md:grid-cols-2"} gap-4`}>
          <div data-testid="user-form-role">
            <SelectDropdown
              options={ROLE_OPTIONS}
              selected={form.role}
              onSelect={(role) => setField("role", role)}
              placeholder="Select role"
            />
          </div>
          {!isNew && <ActiveToggle checked={form.active} onChange={(active) => setField("active", active)} />}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            className="rounded-xl w-full sm:w-auto"
            disabled={isSaving}
            data-testid="user-form-submit"
          >
            {isSaving ? "Saving..." : isNew ? "Add User" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default UserFormPopup;
