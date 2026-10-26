"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { Download, Printer, Trash2, Wallet } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { rangeLabel } from "@/constants/datePresets";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DateRangeButton } from "@/components/ui/DateRangeButton";
import { saveBlob } from "@/features/backup/utils";
import { ledgerCsv, ledgerFileName } from "../utils";

const money = (n) => formatMoney(Math.round((Number(n) || 0) * 100) / 100);

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-bold [overflow-wrap:anywhere] ${tone}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

/** One ledger line: a table row on md+, a compact card on phones. */
function LedgerRow({ row, showVendor, onDeletePayment }) {
  const isPayment = row.kind === "payment";
  const date = format(new Date(row.date), "d MMM yyyy");
  const remove = isPayment ? (
    <button
      type="button"
      onClick={() => onDeletePayment(row)}
      data-tip="Delete payment"
      aria-label="Delete payment"
      className="text-gray-400 hover:text-danger cursor-pointer print:hidden"
      data-testid="ledger-payment-delete"
    >
      <Trash2 size={16} />
    </button>
  ) : null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-gray-100"
      data-testid="purchase-ledger-row"
      data-kind={row.kind}
      data-balance={row.balance}
    >
      {/* Wide ledger (48rem+, measured on the ledger itself so the sidebar is accounted for): columns */}
      <div className="hidden @3xl:grid grid-cols-[100px_minmax(0,1fr)_110px_110px_120px_24px] items-center gap-3 px-4 py-2.5 text-sm">
        <span className="text-gray-600 whitespace-nowrap">{date}</span>
        <span className="min-w-0">
          {showVendor && <span className="block font-semibold text-gray-800 truncate">{row.vendorName}</span>}
          <span className={`block truncate ${isPayment ? "text-success" : "text-gray-700"}`}>{row.detail}</span>
        </span>
        <span className="text-right font-semibold text-gray-800 tabular-nums">{row.debit ? money(row.debit) : ""}</span>
        <span className="text-right font-semibold text-success tabular-nums">
          {row.credit ? money(row.credit) : ""}
        </span>
        <span className="text-right font-bold text-gray-800 tabular-nums">{money(row.balance)}</span>
        <span className="flex justify-end">{remove}</span>
      </div>
      {/* Narrow ledger: a compact card per line */}
      <div className="@3xl:hidden px-3 py-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              {date}
              {showVendor ? ` · ${row.vendorName}` : ""}
            </p>
            <p className={`font-medium [overflow-wrap:anywhere] ${isPayment ? "text-success" : "text-gray-800"}`}>
              {row.detail}
            </p>
          </div>
          {remove}
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
          <span className={isPayment ? "text-success font-semibold" : "text-gray-800 font-semibold"}>
            {isPayment ? `Paid ${money(row.credit)}` : `Purchase ${money(row.debit)}`}
          </span>
          <span className="text-gray-600">
            Balance <b className="text-gray-800">{money(row.balance)}</b>
          </span>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * Purchasing ledger (vendor khata): pick a vendor or all, pick a period; opening balance, every purchase and payment
 * with the running balance, totals, and what is payable to each vendor. `#purchase-ledger-print` is the print area.
 */
export function PurchaseLedgerView({ ledgerApi, vendors, onRecordPayment }) {
  const { ledger, vendorId, setVendorId, range, setRange, isFetching, deletePayment } = ledgerApi;
  const [removing, setRemoving] = useState(null);
  const vendorName = vendors.find((vendor) => String(vendor._id) === vendorId)?.name ?? "";
  const options = [
    { value: "", label: "All vendors" },
    ...vendors.map((v) => ({ value: String(v._id), label: v.name })),
  ];
  const showVendor = !vendorId;
  const payable = ledger.balances.filter((row) => row.balance !== 0);

  const downloadCsv = () => {
    saveBlob(new Blob([ledgerCsv(ledger)], { type: "text/csv;charset=utf-8" }), ledgerFileName(vendorName));
  };

  return (
    <div className="@container space-y-5" data-testid="purchase-ledger">
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Delete this payment?"
            message={`${removing.vendorName} · ${money(removing.credit)} · ${format(new Date(removing.date), "d MMM yyyy")}`}
            confirmLabel="Delete"
            onConfirm={async () => {
              if (await deletePayment(removing._id)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="ledger-payment-delete-confirm"
          />
        )}
      </AnimatePresence>

      {/* Controls: vendor + period, then the actions. One line only when the ledger is wide (64rem+); before that
          the second line keeps the buttons from running over the filters. */}
      <div className="flex flex-col @5xl:flex-row @5xl:items-center gap-3 print:hidden">
        <div className="grid grid-cols-1 @lg:grid-cols-2 gap-3 @5xl:flex @5xl:flex-1">
          <div className="@5xl:w-60" data-testid="ledger-vendor">
            <SelectDropdown options={options} selected={vendorId} onSelect={setVendorId} placeholder="All vendors" />
          </div>
          <DateRangeButton
            range={range}
            onChange={setRange}
            prefix="Date"
            className="@5xl:w-72"
            testId="ledger-date-filter"
          />
        </div>
        <div className="grid grid-cols-2 @lg:flex @lg:justify-end gap-2 @lg:gap-3">
          <Button
            icon={Wallet}
            className="col-span-2 whitespace-nowrap"
            onClick={() => onRecordPayment(vendorId)}
            data-testid="ledger-record-payment"
          >
            Record Payment
          </Button>
          <Button variant="secondary" icon={Printer} className="whitespace-nowrap" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" icon={Download} className="whitespace-nowrap" onClick={downloadCsv}>
            CSV
          </Button>
        </div>
      </div>

      <div id="purchase-ledger-print" className={`space-y-5 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
        <div className="hidden print:block">
          <h2 className="text-xl font-bold text-gray-800">{BRAND.name} · Purchasing ledger</h2>
          <p className="text-sm text-gray-600">
            {vendorName || "All vendors"} · {rangeLabel(range)} · printed {new Date().toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-3">
          <Figure label="Opening balance" value={money(ledger.opening)} testId="ledger-opening" />
          <Figure label="Purchases" value={money(ledger.totals.purchases)} testId="ledger-purchases" />
          <Figure label="Payments" value={money(ledger.totals.payments)} tone="text-success" testId="ledger-payments" />
          <Figure
            label={ledger.totals.closing >= 0 ? "Payable (closing)" : "Paid in advance"}
            value={money(Math.abs(ledger.totals.closing))}
            tone="text-primary"
            testId="ledger-closing"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="hidden @3xl:grid grid-cols-[100px_minmax(0,1fr)_110px_110px_120px_24px] gap-3 px-4 py-2 bg-surface-muted text-xs font-semibold text-gray-500">
            <span>Date</span>
            <span>{showVendor ? "Vendor · details" : "Details"}</span>
            <span className="text-right">Purchase</span>
            <span className="text-right">Payment</span>
            <span className="text-right">Balance</span>
            <span />
          </div>
          <ul>
            <li className="flex justify-between gap-3 px-3 @3xl:px-4 py-2.5 text-sm bg-primary-soft/40">
              <span className="font-semibold text-gray-700">Opening balance</span>
              <span className="font-bold text-gray-800 tabular-nums">{money(ledger.opening)}</span>
            </li>
            {ledger.rows.length === 0 ? (
              <li
                className="px-4 py-10 text-center text-sm text-gray-500 border-t border-gray-100"
                data-testid="ledger-empty"
              >
                No purchases or payments in this period.
              </li>
            ) : (
              ledger.rows.map((row) => (
                <LedgerRow
                  key={`${row.kind}-${row._id}`}
                  row={row}
                  showVendor={showVendor}
                  onDeletePayment={setRemoving}
                />
              ))
            )}
            <li className="flex justify-between gap-3 px-3 @3xl:px-4 py-3 text-sm border-t-2 border-gray-200">
              <span className="font-bold text-gray-800">Closing balance</span>
              <span className="font-bold text-primary tabular-nums" data-testid="ledger-closing-row">
                {money(ledger.totals.closing)}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {!vendorId && payable.length > 0 && (
        <div className="print:hidden" data-testid="ledger-balances">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">Payable by vendor (all time)</h3>
          <ul className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-2">
            {payable.map((row) => (
              <li key={row.vendorId}>
                <button
                  type="button"
                  onClick={() => setVendorId(row.vendorId)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 text-left hover:border-primary/30 hover:shadow-sm transition cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800 truncate">{row.vendorName || "Vendor"}</span>
                    <span className="block text-xs text-gray-500">
                      Bought {money(row.purchases)} · Paid {money(row.payments)}
                    </span>
                  </span>
                  <span className={`shrink-0 font-bold ${row.balance > 0 ? "text-primary" : "text-success"}`}>
                    {row.balance > 0 ? money(row.balance) : `Adv. ${money(-row.balance)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PurchaseLedgerView;
