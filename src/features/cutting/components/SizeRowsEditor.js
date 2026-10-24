"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const ROW_GRID_CLASS = "grid grid-cols-[1fr_1fr_2.5rem] gap-2";
const REMOVE_CLASS =
  "h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 " +
  "cursor-pointer disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed";

/** Editable size/qty rows of the cutting form. `rows` = [{ size, qty }]. */
export function SizeRowsEditor({ rows, onChange }) {
  const update = (index, patch) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { size: "", qty: "" }]);

  return (
    <div className="space-y-2">
      <div className={`${ROW_GRID_CLASS} relative px-1 text-xs font-semibold uppercase tracking-wide text-gray-500`}>
        <span>Size</span>
        <span>Cut qty</span>
        <span className="sr-only">Remove</span>
      </div>
      {rows.map((row, index) => (
        <div key={index} className={`${ROW_GRID_CLASS} items-center`} data-testid="lot-form-size-row">
          <input
            type="text"
            value={row.size}
            onChange={(e) => update(index, { size: e.target.value })}
            placeholder="e.g. 32"
            maxLength={20}
            aria-label={`Size ${index + 1}`}
            className={INPUT_CLASS}
          />
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={row.qty}
            onChange={(e) => update(index, { qty: e.target.value })}
            placeholder="0"
            aria-label={`Quantity for size ${row.size || index + 1}`}
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={rows.length <= 1}
            title="Remove size"
            aria-label="Remove size"
            className={REMOVE_CLASS}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={Plus} onClick={add} data-testid="lot-form-add-size" className="mt-1">
        Add size
      </Button>
    </div>
  );
}

export default SizeRowsEditor;
