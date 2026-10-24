"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { WORKER_TYPES, workerFormFrom } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/** Add or edit a worker (`initialData` with `_id` edits). */
export function WorkerFormPopup({ initialData = null, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(() => workerFormFrom(initialData));
  const isEditing = Boolean(initialData?._id);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.info("Please enter the worker's name.");
      return;
    }
    onSave(form);
  };

  return (
    <Modal onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="worker-form">
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isEditing ? "Edit Worker" : "Add Worker"}
        </h3>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Worker name"
          className={INPUT_CLASS}
          data-testid="worker-form-name"
          autoFocus
          required
        />
        <input
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone (optional)"
          className={INPUT_CLASS}
        />
        <div>
          <input
            type="number"
            name="dailyRate"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.dailyRate}
            onChange={handleChange}
            placeholder="Per-day salary (Rs), e.g. 1000"
            className={INPUT_CLASS}
            data-testid="worker-form-daily-rate"
          />
          <p className="text-xs text-gray-500 mt-1">
            One day of leave is cut at this rate. Leave empty for piece-rate only workers.
          </p>
        </div>
        <CustomDropdown
          options={WORKER_TYPES}
          selected={form.type}
          onSelect={(type) => setForm((prev) => ({ ...prev, type }))}
          containerClassName="w-full"
          buttonClassName="bg-gray-100"
        />
        <input
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          placeholder="Note (optional)"
          className={INPUT_CLASS}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto" data-testid="worker-form-submit">
            {isEditing ? "Save Changes" : "Add Worker"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default WorkerFormPopup;
