"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { History, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { hasSizes } from "../utils";

const ICON_BUTTON_CLASS = "transition-transform hover:scale-125 cursor-pointer";

/** Small labelled value used in the phone layout (labels are a table header on md+). */
function Stat({ label, value }) {
  return (
    <div className="md:hidden">
      <p className="text-[11px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

/** "LOT-1001 · +117" chip linking to the lot that last added stock to this product. */
function LastProductionChip({ lastProduction }) {
  if (!lastProduction?.lotId) return null;
  const qty = Number(lastProduction.qty) || 0;
  return (
    <Link
      href={`/lots/${lastProduction.lotId}`}
      title={`Last production: ${formatDateTime(lastProduction.at)}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-xs
        font-semibold whitespace-nowrap"
      data-testid="product-last-lot"
      data-lot-number={lastProduction.lotNumber}
    >
      <History size={12} />
      {lastProduction.lotNumber} · {qty >= 0 ? `+${qty}` : qty}
    </Link>
  );
}

export function ProductRow({ product, onStockChange, onEdit, onDelete, onHistory }) {
  const purchase = `${product.purchasePrice}/-`;
  const sale = `${product.salePrice}/-`;
  const remaining = `${product.remaining} pcs`;
  const showChips = hasSizes(product) || Boolean(product.lastProduction?.lotId);

  return (
    <motion.div
      data-testid="product-row"
      data-product-name={product.name}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 p-4 rounded-xl text-white transition-transform
        transform hover:scale-[1.01] bg-primary"
    >
      <div className="md:flex-grow min-w-0">
        <span className="font-medium text-lg md:text-base break-words">{product.name}</span>
        {showChips && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {hasSizes(product) &&
              product.sizes.map((row) => (
                <span
                  key={row.size}
                  className="px-2 py-0.5 rounded-full bg-white/15 text-xs font-medium whitespace-nowrap"
                >
                  {row.size} · {Number(row.remaining) || 0}
                </span>
              ))}
            <LastProductionChip lastProduction={product.lastProduction} />
          </div>
        )}
      </div>

      {/* Phone: labelled stats grid. Tablet/desktop: fixed-width columns under the table header. */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <Stat label="Purchase" value={purchase} />
        <Stat label="Sale" value={sale} />
        <Stat label="Remaining" value={remaining} />
      </div>
      <span className="hidden md:inline-block w-32 text-center shrink-0">{purchase}</span>
      <span className="hidden md:inline-block w-32 text-center shrink-0">{sale}</span>
      <span className="hidden md:inline-block w-32 text-center shrink-0">{remaining}</span>

      <div
        className="flex justify-end md:justify-center gap-5 md:gap-2.5 md:w-36 shrink-0 border-t border-white/15
          md:border-0 pt-3 md:pt-0"
      >
        <button
          type="button"
          onClick={() => onStockChange(product._id, "remove")}
          className={ICON_BUTTON_CLASS}
          title="Decrease stock"
          aria-label="Decrease stock"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          data-testid="product-edit"
          onClick={() => onEdit(product._id)}
          className={ICON_BUTTON_CLASS}
          title="Edit product"
          aria-label="Edit product"
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          data-testid="product-stock-history"
          onClick={() => onHistory?.(product._id)}
          className={ICON_BUTTON_CLASS}
          title="Stock history"
          aria-label="Stock history"
        >
          <History size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(product._id)}
          className={ICON_BUTTON_CLASS}
          title="Delete product"
          aria-label="Delete product"
        >
          <Trash2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onStockChange(product._id, "add")}
          className={ICON_BUTTON_CLASS}
          title="Increase stock"
          aria-label="Increase stock"
        >
          <Plus size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default ProductRow;
