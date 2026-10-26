"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Save, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FilterButton } from "@/components/ui/FilterButton";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, paymentProblem } from "@/constants/purchasingLedger";
import { formatMoney } from "@/lib/format";
import { EMPTY_PAYMENT } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Records money paid to a vendor. Shows what is payable to the chosen vendor (all time) with a one-tap
 * "Pay full balance"; paying more is allowed and shows as an advance to the vendor.
 */
export function PaymentModal({ vendors, balances, initialVendorId = "", onSave, onCancel, isSaving = false }) {
  const [form, setForm] = useState({
    ...EMPTY_PAYMENT,
    vendorId: initialVendorId,
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const payable = balances.find((row) => row.vendorId === form.vendorId)?.balance ?? 0;
  const problem = paymentProblem(form);
  const options = vendors.map((vendor) => ({ value: String(vendor._id), label: vendor.name }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!problem) onSave(form);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="payment-form">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Wallet size={22} className="text-primary" /> Record Payment
        </h3>

        <div data-testid="payment-vendor">
          <span className={LABEL_CLASS}>Vendor</span>
          <SelectDropdown
            options={options}
            selected={form.vendorId}
            onSelect={(value) => set("vendorId", value)}
            placeholder={vendors.length ? "Select vendor" : "Add a vendor first"}
          />
        </div>

        {form.vendorId && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-white"
            data-testid="payment-payable"
            data-payable={payable}
          >
            <p className="text-sm text-gray-700">
              {payable >= 0 ? "Payable to this vendor:" : "Paid in advance:"}{" "}
              <span className="font-bold text-gray-800">{formatMoney(Math.abs(payable))}</span>
            </p>
            {payable > 0 && (
              <button
                type="button"
                onClick={() => set("amount", String(payable))}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                data-testid="payment-pay-all"
              >
                Pay full balance
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="payment-amount" className={LABEL_CLASS}>
              Amount (Rs)
            </label>
            <input
              autoComplete="off"
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0"
              className={INPUT_CLASS}
              data-testid="payment-amount"
            />
          </div>
          <div>
            <label htmlFor="payment-date" className={LABEL_CLASS}>
              Date
            </label>
            <DatePickerField
              id="payment-date"
              value={form.date}
              onChange={(value) => set("date", value)}
              testId="payment-date"
            />
          </div>
        </div>

        <div>
          <span className={LABEL_CLASS}>Paid by</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl" role="group">
            {PAYMENT_METHODS.map((method) => (
              <FilterButton
                key={method}
                label={PAYMENT_METHOD_LABELS[method]}
                active={form.method === method}
                aria-pressed={form.method === method}
                onClick={() => set("method", method)}
                wrap
                data-testid={`payment-method-${method}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="payment-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="payment-note"
            type="text"
            maxLength={300}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. cheque no. 1234"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700">
            Payment: <span className="font-bold text-primary">{formatMoney(Number(form.amount) || 0)}</span>
            {form.vendorId && !problem && (
              <span className="block text-xs text-gray-500">
                Payable after this: {formatMoney(payable - (Number(form.amount) || 0))}
              </span>
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
              data-testid="payment-submit"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default PaymentModal;
