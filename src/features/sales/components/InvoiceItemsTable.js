"use client";

import { useRef } from "react";
import { productOfItem } from "../utils";
import { SaleItemSizeSelect } from "./SaleItemSizeSelect";

const BORDER = { borderColor: "var(--color-border)" };
const INPUT = "w-full min-w-0 p-1.5 outline-none text-sm bg-transparent";

/**
 * Editable item rows of the new invoice. Typing in a description shows matching
 * products; picking one fills the price, links the product and focuses the qty cell.
 * A picked product that tracks sizes gets a compact size select next to its name.
 */
export function InvoiceItemsTable({ items, products = [], suggestions, onItemChange, onPickProduct }) {
  const qtyInputs = useRef([]);

  const pick = (index, product) => {
    onPickProduct(index, product);
    qtyInputs.current[index]?.focus();
  };

  return (
    <table className="w-full mb-2 border-collapse">
      <thead>
        <tr className="bg-primary">
          <th className="text-left font-semibold p-2 text-sm w-1/2 text-white">Description</th>
          <th className="font-semibold p-2 text-sm text-white">QTY</th>
          <th className="font-semibold p-2 text-sm text-white">Price</th>
          <th className="font-semibold p-2 text-sm text-white">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
          const showSuggestions = suggestions.rowIndex === index && suggestions.products.length > 0;
          const product = productOfItem(item, products);
          return (
            <tr key={index} className="border text-sm" style={BORDER}>
              <td className="border relative" style={BORDER}>
                <div className="flex items-center gap-1 pr-1">
                  <input
                    type="text"
                    value={item.desc}
                    onChange={(e) => onItemChange(index, "desc", e.target.value)}
                    className={INPUT}
                  />
                  {item.productId && (
                    <SaleItemSizeSelect
                      product={product}
                      value={item.size}
                      onChange={(size) => onItemChange(index, "size", size)}
                      className="no-print shrink-0"
                      textPrefix="Size "
                    />
                  )}
                  {item.size && <span className="hidden print:inline text-xs shrink-0">Size {item.size}</span>}
                </div>
                {showSuggestions && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {suggestions.products.map((option) => (
                      <div
                        key={option._id}
                        onClick={() => pick(index, option)}
                        className="p-2 cursor-pointer hover:bg-gray-100 text-gray-800"
                      >
                        {option.name}
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="border" style={BORDER}>
                <input
                  type="number"
                  ref={(el) => {
                    qtyInputs.current[index] = el;
                  }}
                  value={item.qty}
                  onChange={(e) => onItemChange(index, "qty", e.target.value)}
                  className={`${INPUT} text-center`}
                />
              </td>
              <td className="border" style={BORDER}>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => onItemChange(index, "price", e.target.value)}
                  className={`${INPUT} text-center`}
                />
              </td>
              <td className="p-1.5 text-center border" style={BORDER}>
                {amount > 0 ? amount.toFixed(0) : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default InvoiceItemsTable;
