"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Printer, Plus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { GATE_PASS_LABELS, GATE_PASS_TYPES, canIssueGatePass } from "@/constants/gatepass";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { useGatePasses } from "../hooks/useGatePasses";
import { GatePassModal } from "./GatePassModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

/**
 * Gate passes issued for the lot (stitching / washing) with a print preview each.
 * `canIssue` (admin) shows "Issue …" for a pass type the lot has reached but has no pass for yet.
 */
export function GatePassesCard({ lot, canIssue = false }) {
  const { passes, isLoading, isIssuing, issue } = useGatePasses(lot?._id, lot?.updatedAt);
  const [open, setOpen] = useState(null);
  const missing = GATE_PASS_TYPES.filter(
    (type) => canIssue && !isLoading && canIssueGatePass(lot, type) && !passes.some((pass) => pass.type === type)
  );

  const handleIssue = async (type) => {
    const pass = await issue(type, type === "washing" ? lot.washType || "" : "");
    if (pass) setOpen(pass);
  };

  return (
    <motion.div variants={itemVariants} className={CARD_CLASS} data-testid="lot-gate-passes">
      <AnimatePresence>{open && <GatePassModal pass={open} onClose={() => setOpen(null)} />}</AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <FileText size={18} className="text-primary" />
          Gate passes
        </h2>
        {missing.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {missing.map((type) => (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                icon={Plus}
                disabled={isIssuing}
                onClick={() => handleIssue(type)}
                data-testid={`gate-pass-issue-${type}`}
              >
                Issue {GATE_PASS_LABELS[type].toLowerCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : passes.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="gate-pass-empty">
          A gate pass is issued automatically when the lot is sent to stitching, and again when it goes to washing.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {passes.map((pass) => (
            <li
              key={pass._id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
              data-testid="gate-pass-row"
              data-number={pass.number}
              data-type={pass.type}
            >
              <span className="flex-grow min-w-0">
                <span className="font-semibold text-gray-800">{pass.number}</span>
                <span className="text-gray-600"> · {GATE_PASS_LABELS[pass.type]}</span>
                <span className="block text-xs text-gray-500">
                  {pass.pieces} pcs · {formatDateTime(pass.issuedAt)}
                  {pass.washType ? ` · ${pass.washType}` : ""}
                  {pass.issuedBy?.name ? ` · ${pass.issuedBy.name}` : ""}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={Printer}
                onClick={() => setOpen(pass)}
                data-testid="gate-pass-open"
              >
                Print
              </Button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default GatePassesCard;
