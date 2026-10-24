"use client";

import { useState } from "react";
import { BookOpen, Link2, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown, SelectDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { DEFAULT_UNIT_BY_TYPE, LEDGER_UNITS } from "@/constants/ledger";
import { useLotOptions } from "../hooks/useLotOptions";
import { formFromEntry, ledgerFormProblem } from "../utils";
import { LedgerTypeChips } from "./LedgerTypeChips";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const NO_LOT = { value: "", label: "No lot (loose item)" };

/**
 * Record a new register entry or edit an existing one (`initialData` with `_id`).
 * A prefilled draft without `_id` (lot shortcut) opens as a new entry.
 */
export function LedgerEntryForm({ initialData = null, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [form, setForm] = useState(() => formFromEntry(initialData));
  const { options: lots, isLoading: lotsLoading } = useLotOptions();
  const isEditing = Boolean(initialData?._id);
  const problem = ledgerFormProblem(form);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);

  // Switching the type suggests its usual unit unless the user already typed one.
  const selectType = (type) =>
    setForm((prev) => ({
      ...prev,
      type,
      unit: prev.unit === DEFAULT_UNIT_BY_TYPE[prev.type] ? DEFAULT_UNIT_BY_TYPE[type] : prev.unit,
    }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (problem) {
      toast.info(problem);
      return;
    }
    onSave(form);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="ledger-form">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <BookOpen size={22} className="text-primary" />
          {isEditing ? "Edit Entry" : "New Register Entry"}
        </h3>

        <div>
          <span className={LABEL_CLASS}>Type</span>
          <LedgerTypeChips value={form.type} onChange={selectType} testIdPrefix="ledger-form-type" />
        </div>

        <div>
          <label htmlFor="ledger-item" className={LABEL_CLASS}>
            Item <span className="text-danger">*</span>
          </label>
          <input
            id="ledger-item"
            name="item"
            type="text"
            maxLength={120}
            value={form.item}
            onChange={handleChange}
            placeholder={form.type === "fabric" ? "e.g. Denim 12oz leftover" : "e.g. Slim Fit Denim, YKK zip"}
            className={INPUT_CLASS}
            data-testid="ledger-form-item"
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ledger-qty" className={LABEL_CLASS}>
              Quantity <span className="text-danger">*</span>
            </label>
            <input
              id="ledger-qty"
              name="qty"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.qty}
              onChange={handleChange}
              placeholder="0"
              className={INPUT_CLASS}
              data-testid="ledger-form-qty"
              required
            />
          </div>
          <div data-testid="ledger-form-unit">
            <span className={LABEL_CLASS}>Unit</span>
            <CustomDropdown
              options={[...LEDGER_UNITS]}
              selected={form.unit}
              onSelect={(unit) => set("unit", unit)}
              containerClassName="w-full"
              buttonClassName="bg-gray-100"
            />
          </div>
        </div>

        <div data-testid="ledger-form-lot">
          <span className={`${LABEL_CLASS} flex items-center gap-1.5`}>
            <Link2 size={14} /> Lot <span className="text-gray-400 font-normal">(optional)</span>
          </span>
          <SelectDropdown
            options={[NO_LOT, ...lots]}
            selected={form.lotId}
            onSelect={(lotId) => set("lotId", lotId)}
            placeholder={lotsLoading ? "Loading lots…" : "No lot (loose item)"}
          />
        </div>

        <div>
          <label htmlFor="ledger-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="ledger-note"
            name="note"
            type="text"
            maxLength={500}
            value={form.note}
            onChange={handleChange}
            placeholder="e.g. stitching reject, kept for sample"
            className={INPUT_CLASS}
            data-testid="ledger-form-note"
          />
        </div>

        <p className="text-xs text-gray-500">
          This register is separate from stock. Saving here never changes inventory.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            icon={Save}
            disabled={isSaving || Boolean(problem)}
            className="w-full sm:w-auto"
            data-testid="ledger-form-submit"
          >
            {isSaving ? "Saving…" : isEditing ? "Save Changes" : "Record Entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default LedgerEntryForm;
