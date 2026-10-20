"use client";

import { useRef, useState } from "react";
import { Edit2 } from "lucide-react";
import { formatMoney } from "@/lib/format";

const MIN_CHANGE = 0.01;
const INPUT_CLASS =
  "font-bold text-lg text-red-600 bg-red-50 rounded-md p-1 text-right outline-none ring-2 ring-red-300";

/**
 * Inline-editable "Total Balance" figure. Click the pencil, type, blur/Enter to save.
 * `onSave(customer, newTotalBalance)` performs the API call (see useBalanceUpdate).
 *
 * @param {"start"|"end"} [align="start"]  horizontal alignment of the row
 * @param {string} [inputWidthClass="w-24"]
 * @param {number} [iconSize=14]
 */
export function EditableBalance({ customer, onSave, align = "start", inputWidthClass = "w-24", iconSize = 14 }) {
  const [isEditing, setIsEditing] = useState(false);
  const [balance, setBalance] = useState(customer.totalBalance ?? 0);
  const saving = useRef(false);

  const startEditing = () => {
    setBalance(customer.totalBalance ?? 0); // always edit from the latest total
    setIsEditing(true);
  };

  const reset = () => {
    setIsEditing(false);
    setBalance(customer.totalBalance ?? 0);
  };

  const handleSave = async () => {
    if (saving.current) return; // blur + Enter can both fire
    const newBalance = parseFloat(balance);
    if (Number.isNaN(newBalance) || Math.abs(newBalance - (customer.totalBalance || 0)) < MIN_CHANGE) {
      reset();
      return;
    }
    saving.current = true;
    try {
      const saved = await onSave(customer, newBalance);
      if (!saved) reset();
    } finally {
      saving.current = false;
      setIsEditing(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${align === "end" ? "justify-end" : ""}`}>
      {isEditing ? (
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className={`${INPUT_CLASS} ${inputWidthClass}`}
          autoFocus
        />
      ) : (
        <>
          <p className="font-bold text-lg text-red-600">{formatMoney(customer.totalBalance)}</p>
          <button
            type="button"
            onClick={startEditing}
            className="text-gray-400 hover:text-red-500 cursor-pointer"
            title="Edit Balance"
            aria-label="Edit balance"
          >
            <Edit2 size={iconSize} />
          </button>
        </>
      )}
    </div>
  );
}

export default EditableBalance;
