"use client";

import { useState } from "react";
import { PackagePlus, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SuggestInput } from "@/components/ui/SuggestInput";
import { FABRIC_UNITS, fabricKey, formatFabricQty, receiptProblem } from "@/constants/fabric";
import { balanceOf, fabricSuggestions, receiptForm } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Records fabric received from the store (or corrects a receipt when `receipt` is given). The fabric name suggests
 * the fabrics already in the khata; the footer shows what will be in hand after saving. Admin (`holders` given)
 * picks which cutting master got the fabric.
 */
export function ReceiveFabricModal({
  receipt = null,
  balances,
  admin = false,
  holders = [],
  onSave,
  onCancel,
  isSaving,
}) {
  const [form, setForm] = useState(() => receiptForm(receipt));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const problem = receiptProblem(form);
  const row = balanceOf(balances, form.name, form.unit);
  // Editing: the receipt's own quantity is already inside the balance.
  const already =
    receipt && fabricKey(receipt.name, receipt.unit) === fabricKey(form.name, form.unit) ? receipt.qty : 0;
  const after = (row?.balance ?? 0) - already + (Number(form.qty) || 0);
  const holderOptions = [{ value: "", label: "Me (admin)" }, ...holders.map((h) => ({ value: h.id, label: h.name }))];

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!problem) onSave(form);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="fabric-receipt-form">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <PackagePlus size={22} className="text-primary" /> {receipt ? "Edit Fabric Receipt" : "Receive Fabric"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fabric-receipt-date" className={LABEL_CLASS}>
              Date received
            </label>
            <DatePickerField
              id="fabric-receipt-date"
              value={form.day}
              onChange={(value) => set("day", value)}
              testId="fabric-receipt-date"
            />
          </div>
          {admin && (
            <div data-testid="fabric-receipt-holder">
              <span className={LABEL_CLASS}>Given to</span>
              <SelectDropdown
                options={holderOptions}
                selected={holders.some((h) => h.id === form.holderId) ? form.holderId : ""}
                onSelect={(value) => set("holderId", value)}
                ariaLabel="Cutting master who got the fabric"
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="fabric-receipt-name" className={LABEL_CLASS}>
            Fabric
          </label>
          <SuggestInput
            id="fabric-receipt-name"
            value={form.name}
            onChange={(value) => set("name", value)}
            onPick={(option) => setForm((prev) => ({ ...prev, name: option.name, unit: option.unit }))}
            options={fabricSuggestions(balances)}
            placeholder="e.g. 15-14 KZ"
            maxLength={120}
            className={INPUT_CLASS}
            testId="fabric-receipt-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="fabric-receipt-qty" className={LABEL_CLASS}>
              Quantity
            </label>
            <input
              autoComplete="off"
              id="fabric-receipt-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.qty}
              onChange={(e) => set("qty", e.target.value)}
              placeholder="e.g. 500"
              className={INPUT_CLASS}
              data-testid="fabric-receipt-qty"
            />
          </div>
          <div>
            <span className={LABEL_CLASS}>Unit</span>
            <SelectDropdown
              options={FABRIC_UNITS.map((unit) => ({ value: unit, label: unit }))}
              selected={form.unit}
              onSelect={(unit) => set("unit", unit)}
              ariaLabel="Fabric unit"
              testId="fabric-receipt-unit"
            />
          </div>
        </div>

        <div>
          <label htmlFor="fabric-receipt-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="fabric-receipt-note"
            type="text"
            maxLength={300}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. from store, 4 rolls"
            className={INPUT_CLASS}
            data-testid="fabric-receipt-note"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="fabric-receipt-after">
            {row ? (
              <>
                In hand now: <b className="text-gray-800">{formatFabricQty(row.balance, row.unit)}</b>
                <span className="block text-xs text-gray-500">
                  After this: <b className="text-primary">{formatFabricQty(after, form.unit)}</b>
                </span>
              </>
            ) : (
              <>
                New fabric in the khata
                <span className="block text-xs text-gray-500">
                  In hand after this:{" "}
                  <b className="text-primary">{formatFabricQty(Number(form.qty) || 0, form.unit)}</b>
                </span>
              </>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Save}
              disabled={isSaving || Boolean(problem)}
              className="flex-1 sm:flex-none"
              data-testid="fabric-receipt-submit"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ReceiveFabricModal;
