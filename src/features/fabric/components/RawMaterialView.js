"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, PackagePlus, Search } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatRolls, formatUnitTotals } from "@/constants/fabric";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useFabricKhata } from "../hooks/useFabricKhata";
import { FabricInHand } from "./FabricInHand";
import { ReceiveFabricModal } from "./ReceiveFabricModal";

const SEARCH_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary";

function Figure({ label, value, sub, tone = "text-gray-800", testId }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-xl font-bold tabular-nums [overflow-wrap:anywhere] ${tone}`} data-testid={testId}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

/**
 * Inventory → Raw material: the fabric in the factory (client, 2026-10-29: "inventory do qism ki — raw aur ready").
 * The cutting masters record what comes in (Fabric Khata); every cutting entry takes its fabric out by itself. Admin
 * sees every cutting master together or one of them, and can record fabric for a cutting master here too.
 */
export function RawMaterialView() {
  const k = useFabricKhata();
  const { khata } = k;
  const [search, setSearch] = useState("");
  const [receiving, setReceiving] = useState(false);

  if (k.isLoading) return <Loader inline />;

  const needle = search.trim().toLowerCase();
  const balances = khata.balances.filter((row) => !needle || row.name.toLowerCase().includes(needle));
  const rolls = khata.totals.reduce((sum, row) => sum + (row.rolls || 0), 0);
  const holderOptions = [
    { value: "", label: "All cutting masters" },
    ...khata.holders.map((h) => ({ value: h.id, label: h.name })),
  ];

  const save = async (form) => {
    if (await k.saveReceipt(form)) setReceiving(false);
  };

  return (
    <div className="@container space-y-5" data-testid="raw-material">
      <AnimatePresence>
        {receiving && (
          <ReceiveFabricModal
            balances={khata.balances}
            admin={khata.admin}
            holders={khata.holders}
            isSaving={k.isSaving}
            onSave={save}
            onCancel={() => setReceiving(false)}
          />
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="flex flex-col @3xl:flex-row @3xl:items-center gap-3">
        <div className="relative w-full @3xl:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoComplete="off"
            type="text"
            placeholder="Search fabric"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={SEARCH_CLASS}
            data-testid="raw-search"
          />
        </div>
        {khata.admin && (
          <div className="@3xl:w-64" data-testid="raw-holder-filter">
            <SelectDropdown
              options={holderOptions}
              selected={k.holderId}
              onSelect={k.setHolderId}
              ariaLabel="Cutting master"
            />
          </div>
        )}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 @3xl:ml-auto @3xl:flex">
          <Link href="/fabric" className="w-full @3xl:w-auto">
            <Button variant="secondary" icon={CalendarDays} className="w-full whitespace-nowrap">
              Day by day
            </Button>
          </Link>
          <Button
            icon={PackagePlus}
            onClick={() => setReceiving(true)}
            className="w-full @3xl:w-auto whitespace-nowrap"
            data-testid="raw-receive"
          >
            Receive Fabric
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 @2xl:grid-cols-3 gap-3">
        <Figure
          label="Fabric received"
          value={formatUnitTotals(khata.totals, "received")}
          sub={rolls ? formatRolls(rolls) : ""}
          testId="raw-received"
        />
        <Figure label="Used in cutting" value={formatUnitTotals(khata.totals, "used")} testId="raw-used" />
        <Figure
          label="In stock (raw)"
          value={formatUnitTotals(khata.totals, "balance")}
          tone="text-primary"
          testId="raw-balance"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <FabricInHand balances={balances} />
      </motion.div>
    </div>
  );
}

export default RawMaterialView;
