"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Droplets, Scissors, Spool, Ticket, Truck } from "lucide-react";
import { Panel, PanelEmpty } from "./Panel";

const TYPE_STYLE = {
  cutting: { label: "Cutting pass", icon: Scissors, tint: "bg-gray-100 text-gray-700" },
  stitching: { label: "To stitching", icon: Spool, tint: "bg-yellow-100 text-yellow-800" },
  washing: { label: "To washing", icon: Droplets, tint: "bg-primary-soft text-primary" },
  dispatch: { label: "Dispatched", icon: Truck, tint: "bg-success-soft text-success" },
};

/** The latest gate passes (cutting entries, pieces leaving for stitching or washing, goods dispatched), newest first. */
export function GatePassFeed({ passes, className = "" }) {
  return (
    <Panel
      icon={Ticket}
      title="Recent gate passes"
      subtitle="Cutting, stitching, washing and dispatch"
      href="/stitching"
      linkLabel="Stitching"
      className={className}
      testId="dash-gatepasses"
    >
      {passes.length === 0 ? (
        <PanelEmpty
          icon={Ticket}
          title="No gate passes yet"
          hint="A pass is made at the cutting entry and when a lot goes to stitching or washing."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {passes.map((pass, index) => {
            const style = TYPE_STYLE[pass.type] ?? TYPE_STYLE.stitching;
            const Icon = style.icon;
            return (
              <motion.li
                key={pass._id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Link
                  href={`/lots/${pass.lotId}`}
                  className="flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-lg hover:bg-surface-muted transition-colors"
                  data-testid="dash-gatepass-row"
                >
                  <span className={`grid place-items-center w-9 h-9 rounded-xl shrink-0 ${style.tint}`}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {pass.number}
                      <span className="font-normal text-gray-500">
                        {" "}
                        · {pass.lotNumber} · {pass.productName}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {style.label}
                      {pass.partial ? " (part)" : ""}
                      {pass.washType ? ` · ${pass.washType}` : ""}
                      {pass.party ? ` · ${pass.party}` : ""} ·{" "}
                      {formatDistanceToNowStrict(new Date(pass.issuedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-gray-800 tabular-nums">
                      {(Number(pass.pieces) || 0).toLocaleString("en-US")}
                    </span>
                    <span className="block text-[11px] text-gray-500">pcs</span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default GatePassFeed;
