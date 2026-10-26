"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FilterButton } from "@/components/ui/FilterButton";
import { useToast } from "@/components/ui/ToastProvider";
import { MAIN_OPERATIONS, MAIN_OPERATION_LABELS } from "@/constants/operations";
import { operationFormFrom } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/** Add or edit an operation: its main operation (Stitching, Washing …), name and default per-piece rate. */
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
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="operation-form">
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isEditing ? "Edit Operation" : "Add Operation"}
        </h3>
        <input
          autoComplete="off"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Operation (e.g. Overlock, Safety, Belt)"
          className={INPUT_CLASS}
          data-testid="operation-form-name"
          autoFocus
          required
        />
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Main operation</span>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 p-1 bg-gray-100 rounded-xl" role="group">
            {MAIN_OPERATIONS.map((stage) => (
              <FilterButton
                key={stage}
                label={MAIN_OPERATION_LABELS[stage]}
                active={form.stage === stage}
                aria-pressed={form.stage === stage}
                onClick={() => setForm((prev) => ({ ...prev, stage }))}
                wrap
                data-testid={`operation-form-stage-${stage}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Overlock, Safety and Belt, for example, are parts of Stitching.</p>
        </div>
        <input
          autoComplete="off"
          type="number"
          name="rate"
          inputMode="decimal"
          min={0}
          step="any"
          value={form.rate}
          onChange={handleChange}
          placeholder="Default rate per piece (Rs), e.g. 3.5"
          className={INPUT_CLASS}
          data-testid="operation-form-rate"
          required
        />
        {isEditing && (
          <p className="text-xs text-gray-500">
            Changing the rate affects new work entries only. Already saved wages keep their old rate. A category&apos;s
            rate card can set its own rate.
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
