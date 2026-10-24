"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { operationFormFrom } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/** Add or edit a stitching operation and its per-piece rate. */
export function OperationFormPopup({ initialData = null, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(() => operationFormFrom(initialData));
  const isEditing = Boolean(initialData?._id);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.info("Please enter the operation name.");
      return;
    }
    if (!(Number(form.rate) >= 0) || form.rate === "") {
      toast.info("Please enter the rate per piece (0 or more).");
      return;
    }
    onSave(form);
  };

  return (
    <Modal onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="operation-form">
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isEditing ? "Edit Operation" : "Add Operation"}
        </h3>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Operation (e.g. Belt, Pocket, Side seam)"
          className={INPUT_CLASS}
          data-testid="operation-form-name"
          autoFocus
          required
        />
        <input
          type="number"
          name="rate"
          inputMode="decimal"
          min={0}
          step="any"
          value={form.rate}
          onChange={handleChange}
          placeholder="Rate per piece (Rs), e.g. 3.5"
          className={INPUT_CLASS}
          data-testid="operation-form-rate"
          required
        />
        {isEditing && (
          <p className="text-xs text-gray-500">
            Changing the rate affects new work entries only. Already saved wages keep their old rate.
          </p>
        )}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto" data-testid="operation-form-submit">
            {isEditing ? "Save Changes" : "Add Operation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default OperationFormPopup;
