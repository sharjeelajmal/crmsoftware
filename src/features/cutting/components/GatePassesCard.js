"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Printer, Plus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { GATE_PASS_LABELS, ISSUABLE_GATE_PASS_TYPES, canIssueGatePass } from "@/constants/gatepass";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { useGatePasses } from "../hooks/useGatePasses";
import { GatePassModal } from "./GatePassModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

/**
 * Gate passes issued for the lot with a print preview each.
 * `canIssue` (admin) shows "Issue …" for a pass type the lot has reached but has no pass for yet.
 * `types` limits the list (the cutting master's portal shows only the cutting gate pass).
 */
export function GatePassesCard({ lot, canIssue = false, types = null }) {
  const { passes: all, isLoading, isIssuing, issue } = useGatePasses(lot?._id, lot?.updatedAt);
  const passes = types ? all.filter((pass) => types.includes(pass.type)) : all;
  const [open, setOpen] = useState(null);
  const missing = ISSUABLE_GATE_PASS_TYPES.filter(
    (type) => canIssue && !isLoading && canIssueGatePass(lot, type) && !passes.some((pass) => pass.type === type)
  );
  // An edit of the cutting details issues a fresh cutting pass; the older ones stay listed but are marked old.
  const latestCutting = passes.reduce(
    (latest, pass) => (pass.type === "cutting" && (!latest || pass.seq > latest.seq) ? pass : latest),
    null
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
          {types
            ? "The cutting gate pass is made when the cutting entry is saved."
            : "The cutting gate pass is made when the cutting entry is saved, the stitching gate pass when the invoice is " +
              "sent to stitching, and the washing gate pass when it goes to washing."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {passes.map((pass) => {
            const replaced = pass.type === "cutting" && latestCutting && pass.seq < latestCutting.seq;
            return (
              <li
                key={pass._id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
                data-testid="gate-pass-row"
                data-number={pass.number}
                data-type={pass.type}
                data-replaced={replaced ? "true" : undefined}
              >
                <span className={`flex-grow min-w-0 ${replaced ? "opacity-60" : ""}`}>
                  <span className="font-semibold text-gray-800">{pass.number}</span>
                  <span className="text-gray-600"> · {GATE_PASS_LABELS[pass.type]}</span>
                  {replaced && (
                    <span
                      className="ml-1.5 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600"
                      data-testid="gate-pass-replaced"
                    >
                      Old · use {latestCutting.number}
                    </span>
                  )}
                  <span className="block text-xs text-gray-500">
                    {pass.pieces} pcs · {formatDateTime(pass.issuedAt)}
                    {pass.washType ? ` · ${pass.washType}` : ""}
                    {pass.party ? ` · to ${pass.party}` : ""}
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
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

export default GatePassesCard;
