"use client";

import { Plus, Trash2 } from "lucide-react";
import { sumSizes } from "../utils";

const CELL_CLASS = "w-full min-w-0 p-2.5 bg-gray-100 rounded-xl outline-none text-sm";
const GRID_CLASS = "grid grid-cols-[1fr_1fr_2rem] gap-2 items-center";

/** Editable list of `{ size, remaining }` rows; the total is derived from the rows, never typed. */
export function SizeRowsEditor({ rows, onChange, quantityLabel = "Quantity" }) {
  const update = (index, field, value) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { size: "", remaining: "" }]);

  return (
    <div className="space-y-2">
      <div className={`${GRID_CLASS} px-1 text-xs font-semibold uppercase tracking-wide text-gray-500`}>
        <span>Size</span>
        <span>{quantityLabel}</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div key={index} data-testid="product-size-row" className={GRID_CLASS}>
          <input
            autoComplete="off"
            type="text"
            value={row.size}
            onChange={(e) => update(index, "size", e.target.value)}
            placeholder="e.g. 32"
            aria-label="Size"
            className={CELL_CLASS}
          />
          <input
            autoComplete="off"
            type="number"
            min="0"
            value={row.remaining}
            onChange={(e) => update(index, "remaining", e.target.value)}
            placeholder="0"
            aria-label={quantityLabel}
            className={CELL_CLASS}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label="Remove size"
            data-tip="Remove size"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-80 cursor-pointer"
        >
          <Plus size={16} /> Add size
        </button>
        <span className="text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-800">{sumSizes(rows)} pcs</span>
        </span>
      </div>
    </div>
  );
}

export default SizeRowsEditor;
