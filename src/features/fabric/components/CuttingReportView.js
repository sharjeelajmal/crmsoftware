"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { MessageSquareText } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { valueToDate } from "@/constants/datePresets";
import { formatFabricQty } from "@/constants/fabric";
import { formatShrinkage } from "@/constants/gatepass";
import { sizesText } from "../utils";

const FABRIC_COLUMNS = "grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] items-center gap-3";
const qtyOrDash = (qty, unit) => (qty ? formatFabricQty(qty, unit) : "—");
const unitList = (list = [], empty = "—") =>
  list.length ? list.map((row) => formatFabricQty(row.qty, row.unit)).join(" · ") : empty;

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-white border border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-bold [overflow-wrap:anywhere] tabular-nums ${tone}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

function FabricTable({ fabrics }) {
  if (fabrics.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500">
        No fabric in hand. Fabric received on the Fabric Khata page shows up here.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div
        className={`hidden @2xl:grid ${FABRIC_COLUMNS} px-4 py-2 bg-surface-muted text-xs font-semibold text-gray-500`}
      >
        <span>Fabric</span>
        <span className="text-right">Opening</span>
        <span className="text-right">Received</span>
        <span className="text-right">Used</span>
        <span className="text-right">In hand</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {fabrics.map((row) => (
          <li
            key={row.key}
            className="px-3 @2xl:px-4 py-2.5 text-sm"
            data-testid="report-fabric-row"
            data-key={row.key}
            data-closing={row.closing}
          >
            <div className={`hidden @2xl:grid ${FABRIC_COLUMNS}`}>
              <span className="min-w-0 font-semibold text-gray-800 [overflow-wrap:anywhere]">{row.name}</span>
              <span className="text-right tabular-nums text-gray-700">{formatFabricQty(row.opening, row.unit)}</span>
              <span className="text-right tabular-nums font-semibold text-success">
                {qtyOrDash(row.received, row.unit)}
              </span>
              <span className="text-right tabular-nums font-semibold text-gray-800">
                {qtyOrDash(row.used, row.unit)}
              </span>
              <span className={`text-right tabular-nums font-bold ${row.closing < 0 ? "text-danger" : "text-primary"}`}>
                {formatFabricQty(row.closing, row.unit)}
              </span>
            </div>
            <div className="@2xl:hidden">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-semibold text-gray-800 [overflow-wrap:anywhere]">{row.name}</span>
                <span className={`shrink-0 font-bold tabular-nums ${row.closing < 0 ? "text-danger" : "text-primary"}`}>
                  {formatFabricQty(row.closing, row.unit)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600 tabular-nums">
                Opening {formatFabricQty(row.opening, row.unit)} · Received {qtyOrDash(row.received, row.unit)} · Used{" "}
                {qtyOrDash(row.used, row.unit)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LotEntry({ lot, href, index }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.2 }}
      className="rounded-2xl border border-gray-100 bg-white p-4 break-inside-avoid"
      data-testid="report-lot-row"
      data-lot={lot.lotNumber}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <Link href={href} className="font-bold text-primary hover:underline">
            {lot.lotNumber}
          </Link>
          <span className="text-gray-700"> · {lot.productName || "—"}</span>
          <p className="text-xs text-gray-500">
            {format(new Date(lot.createdAt), "h:mm a")}
            {lot.createdBy?.name ? ` · ${lot.createdBy.name}` : ""}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xl font-bold text-gray-800 tabular-nums">{lot.cutQty} pcs</span>
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4 gap-x-4 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-gray-500">Fabric used</dt>
          <dd className="font-semibold text-gray-800 [overflow-wrap:anywhere]" data-testid="report-lot-fabric">
            {lot.fabric?.name ? `${lot.fabric.name} · ${qtyOrDash(lot.fabric.qty, lot.fabric.unit)}` : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-gray-500">Sizes</dt>
          <dd className="text-gray-800 [overflow-wrap:anywhere]">{sizesText(lot.sizes) || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Cut no.</dt>
          <dd className="text-gray-800">{lot.bundleNumber || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Shrinkage</dt>
          <dd className="text-gray-800 [overflow-wrap:anywhere]">{formatShrinkage(lot.shrinkage)}</dd>
        </div>
      </dl>
      {lot.note && (
        <p
          className="mt-3 flex gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-gray-800"
          data-testid="report-lot-remarks"
        >
          <MessageSquareText size={16} className="shrink-0 mt-0.5 text-yellow-700" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <b className="text-yellow-800">Remarks:</b> {lot.note}
          </span>
        </p>
      )}
    </motion.li>
  );
}

/**
 * The daily cutting report: totals, fabric per kind (opening / received / used / in hand), every cutting entry of
 * the day with its sizes, bundle and remarks, and the fabric received. `#cutting-report-print` is the print area.
 */
export function CuttingReportView({ report, holderName = "", isFetching = false }) {
  const date = valueToDate(report.day);
  const lotHref = (lot) => (report.admin ? `/lots/${lot._id}` : `/cutting/${lot._id}`);

  return (
    <div id="cutting-report-print" className={`space-y-6 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
      <div>
        <p className="hidden print:block text-sm font-semibold text-gray-600">{BRAND.name} · Daily cutting report</p>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800" data-testid="report-date">
          {date ? format(date, "EEEE, d MMMM yyyy") : report.day}
        </h2>
        {holderName && <p className="text-sm text-gray-500">{holderName}</p>}
      </div>

      <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-3">
        <Figure label="Lots cut" value={report.totals.lots} testId="report-lots" />
        <Figure label="Pieces cut" value={report.totals.pieces.toLocaleString("en-US")} testId="report-pieces" />
        <Figure label="Fabric used" value={unitList(report.totals.used)} testId="report-used" />
        <Figure
          label="Fabric received"
          value={unitList(report.totals.received)}
          tone="text-success"
          testId="report-received"
        />
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800">Fabric balance</h3>
        <FabricTable fabrics={report.fabrics} />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800">Cutting entries</h3>
        {report.lots.length === 0 ? (
          <p
            className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500"
            data-testid="report-no-lots"
          >
            No cutting on this day.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.lots.map((lot, index) => (
              <LotEntry key={lot._id} lot={lot} href={lotHref(lot)} index={index} />
            ))}
          </ul>
        )}
      </section>

      {report.receipts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-gray-800">Fabric received this day</h3>
          <ul className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100">
            {report.receipts.map((receipt) => (
              <li key={receipt._id} className="flex flex-wrap justify-between gap-x-4 px-4 py-2.5 text-sm">
                <span className="min-w-0 text-gray-800 [overflow-wrap:anywhere]">
                  {receipt.name}
                  {receipt.note ? <span className="text-gray-500"> · {receipt.note}</span> : null}
                </span>
                <span className="font-bold text-success tabular-nums">
                  + {formatFabricQty(receipt.qty, receipt.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="hidden print:flex justify-between pt-10 text-xs text-gray-600">
        <span className="w-2/5 border-t border-gray-400 pt-1 text-center">Cutting master</span>
        <span className="w-2/5 border-t border-gray-400 pt-1 text-center">Checked by</span>
      </div>
    </div>
  );
}

export default CuttingReportView;
