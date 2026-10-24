"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Scroll, Ruler, StickyNote, History } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { formatPieces } from "../utils";
import { LotStageBadge } from "./LotStageBadge";
import { LotPipeline } from "./LotPipeline";
import { LotHistory } from "./LotHistory";
import { GatePassesCard } from "./GatePassesCard";
import { formatShrinkage } from "@/constants/gatepass";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

function CardTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
      <Icon size={18} className="text-primary" />
      {children}
    </h2>
  );
}

/**
 * Full lot view: header, pipeline, fabric, sizes, note and history.
 * `editHref` shows the Edit button (only while the lot is at the cutting stage).
 * `actions` renders extra buttons in the header; `afterPipeline` renders right under the pipeline card;
 * `footer` renders below the history. `canIssueGatePass` (admin) enables issuing/reissuing gate passes.
 */
export function LotDetail({
  lot,
  backHref,
  backLabel = "Back",
  editHref,
  actions,
  afterPipeline,
  footer,
  canIssueGatePass = false,
}) {
  const canEdit = lot.stage === "cutting" && Boolean(editHref);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
      data-testid="lot-detail"
      data-lot-number={lot.lotNumber}
      data-stage={lot.stage}
    >
      <motion.div variants={itemVariants}>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3">
          <ArrowLeft size={16} /> {backLabel}
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{lot.lotNumber}</h1>
              <LotStageBadge stage={lot.stage} className="text-sm px-3 py-1.5" />
            </div>
            <p className="text-lg text-gray-700 mt-1 break-words">{lot.productName}</p>
            <p className="text-sm text-gray-500 mt-1">
              Created by <span className="font-semibold text-gray-700">{lot.createdBy?.name || "—"}</span> ·{" "}
              {formatDateTime(lot.createdAt)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:shrink-0">
            {canEdit && (
              <Link href={editHref} className="w-full sm:w-auto" data-testid="lot-detail-edit">
                <Button icon={Pencil} className="w-full">
                  Edit
                </Button>
              </Link>
            )}
            {actions}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={CARD_CLASS}>
        <LotPipeline lot={lot} />
      </motion.div>

      {afterPipeline}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <motion.div variants={itemVariants} className={CARD_CLASS}>
          <CardTitle icon={Scroll}>Fabric</CardTitle>
          <p className="text-xl font-semibold text-gray-800 break-words">{lot.fabric?.name || "—"}</p>
          <p className="text-gray-600 mt-1">
            {Number(lot.fabric?.qty) || 0} {lot.fabric?.unit || "m"}
          </p>
          <dl className="grid grid-cols-3 gap-2 mt-4 text-sm" data-testid="lot-cutting-details">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Bundle no.</dt>
              <dd className="font-semibold text-gray-800 break-words">{lot.bundleNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Shrinkage</dt>
              <dd className="font-semibold text-gray-800">{formatShrinkage(lot.shrinkage)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Wash</dt>
              <dd className="font-semibold text-gray-800 break-words">{lot.washType || "—"}</dd>
            </div>
          </dl>
        </motion.div>

        <motion.div variants={itemVariants} className={CARD_CLASS}>
          <CardTitle icon={Ruler}>Sizes</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-1.5 font-semibold">Size</th>
                <th className="py-1.5 font-semibold text-right">Cut qty</th>
              </tr>
            </thead>
            <tbody>
              {(lot.sizes || []).map((row) => (
                <tr key={row.size} className="border-t border-gray-100">
                  <td className="py-2 font-medium text-gray-800">{row.size}</td>
                  <td className="py-2 text-right text-gray-700">{row.qty}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 font-bold text-gray-800">Total</td>
                <td className="py-2 text-right font-bold text-primary">{formatPieces(lot.cutQty)}</td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </div>

      {lot.note ? (
        <motion.div variants={itemVariants} className={CARD_CLASS}>
          <CardTitle icon={StickyNote}>Note</CardTitle>
          <p className="text-gray-700 whitespace-pre-line break-words">{lot.note}</p>
        </motion.div>
      ) : null}

      <GatePassesCard lot={lot} canIssue={canIssueGatePass} />

      <motion.div variants={itemVariants} className={CARD_CLASS}>
        <CardTitle icon={History}>History</CardTitle>
        <LotHistory events={lot.events} />
      </motion.div>

      {footer}
    </motion.div>
  );
}

export default LotDetail;
