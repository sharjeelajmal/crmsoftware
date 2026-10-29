"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Loader } from "@/components/ui/Loader";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useStockMovements } from "../hooks/useStockMovements";

const REASON_LABELS = {
  lot_ready: "Lot ready",
  lot_reversed: "Reversed",
  lot_dispatch: "Dispatched",
};

const reasonLabel = (reason) => REASON_LABELS[reason] || reason || "—";

const qtyClass = (qty) => (Number(qty) < 0 ? "text-danger" : "text-success");

const formatSignedQty = (qty) => {
  const n = Number(qty) || 0;
  return n > 0 ? `+${n}` : String(n);
};

function MovementRow({ movement }) {
  const lotHref = movement.lotId ? `/lots/${movement.lotId}` : null;
  return (
    <li
      className="py-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 text-sm"
      data-testid="stock-history-row"
      data-reason={movement.reason}
      data-qty={Number(movement.qty) || 0}
    >
      <div className="md:w-40 shrink-0 text-xs md:text-sm text-gray-500">{formatDateTime(movement.at)}</div>
      <div className="md:flex-grow min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {lotHref ? (
          <Link href={lotHref} className="font-semibold text-primary hover:underline">
            {movement.lotNumber || "Lot"}
          </Link>
        ) : (
          <span className="font-semibold text-gray-800">{movement.lotNumber || "—"}</span>
        )}
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            movement.reason === "lot_reversed"
              ? "bg-danger-soft text-danger"
              : movement.reason === "lot_dispatch"
                ? "bg-primary-soft text-primary"
                : "bg-success-soft text-success"
          }`}
        >
          {reasonLabel(movement.reason)}
        </span>
        {movement.size ? <span className="text-gray-600">Size {movement.size}</span> : null}
        {movement.by?.name ? <span className="text-gray-500">by {movement.by.name}</span> : null}
        {movement.note ? <span className="w-full text-xs text-gray-500 break-words">{movement.note}</span> : null}
      </div>
      <div className={`md:w-20 shrink-0 md:text-right font-bold ${qtyClass(movement.qty)}`}>
        {formatSignedQty(movement.qty)} pcs
      </div>
    </li>
  );
}

/** Production stock audit trail of one product: every lot that added pieces (or took them back). */
export function StockHistoryPopup({ product, onClose }) {
  const { movements, isLoading, error } = useStockMovements(product?._id);

  return (
    <Modal onClose={onClose} size="xl">
      <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800 pr-8">
        <History size={22} className="text-primary" />
        Stock history
      </h3>
      <p className="text-sm text-gray-500 mt-1 break-words">
        {product?.name} · production entries (sales and purchases are not listed here)
      </p>

      <div className="mt-4" data-testid="stock-history-list">
        {isLoading ? (
          <Loader inline />
        ) : error ? (
          <p className="text-sm text-danger py-6 text-center">{errorMessage(error, "Could not load the history")}</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No production entries yet for this product.</p>
        ) : (
          <>
            <div className="hidden md:flex text-xs uppercase tracking-wide text-gray-500 font-semibold pb-1 gap-3">
              <span className="w-40 shrink-0">Date</span>
              <span className="flex-grow">Lot · reason</span>
              <span className="w-20 shrink-0 text-right">Pieces</span>
            </div>
            <ul>
              {movements.map((movement, index) => (
                <MovementRow key={movement._id || index} movement={movement} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

export default StockHistoryPopup;
