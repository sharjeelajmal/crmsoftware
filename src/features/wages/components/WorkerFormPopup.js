"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { groupOperations } from "@/constants/operations";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { WORKER_TYPES, workerFormFrom } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/**
 * The operations he usually does, as toggle chips grouped by main operation (with the rate per piece). The stitching
 * khata shows them on his box and offers them first when his work is entered.
 */
function UsualOperations({ operations, selected, onToggle }) {
  const groups = groupOperations(operations.filter((op) => op.active !== false || selected.includes(String(op._id))));
  if (groups.length === 0) return null;
  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-1">
        Operations he does <span className="text-gray-400">(optional)</span>
      </p>
      <div
        className="max-h-56 overflow-y-auto rounded-xl bg-gray-50 p-3 space-y-3"
        data-testid="worker-form-operations"
      >
        {groups.map((group) => (
          <div key={group.stage}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.operations.map((op) => {
                const id = String(op._id);
                const on = selected.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(id)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      on
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary"
                    }`}
                    data-testid="worker-form-operation"
                    data-operation={op.name}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                    {op.name} · Rs {Number(op.rate) || 0}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Add or edit a worker (`initialData` with `_id` edits). `operations` lets him be given the operations he does. */
export function WorkerFormPopup({ initialData = null, operations = [], onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(() => workerFormFrom(initialData));
  const isEditing = Boolean(initialData?._id);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const toggleOperation = (id) =>
    setForm((prev) => ({
      ...prev,
      operationIds: prev.operationIds.includes(id)
        ? prev.operationIds.filter((x) => x !== id)
        : [...prev.operationIds, id],
    }));

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
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="worker-form">
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isEditing ? "Edit Worker" : "Add Worker"}
        </h3>
        <input
          autoComplete="off"
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
          autoComplete="off"
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone (optional)"
          className={INPUT_CLASS}
        />
        <div>
          <input
            autoComplete="off"
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
        <UsualOperations operations={operations} selected={form.operationIds} onToggle={toggleOperation} />
        <input
          autoComplete="off"
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
