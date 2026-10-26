"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { ClipboardList, PackageCheck, PackagePlus, Printer, Scissors, Scroll } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { BRAND } from "@/constants/brand";
import { rangeLabel } from "@/constants/datePresets";
import { formatFabricQty, formatUnitTotals } from "@/constants/fabric";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DateRangeButton } from "@/components/ui/DateRangeButton";
import { useFabricKhata } from "@/features/fabric/hooks/useFabricKhata";
import { FabricInHand } from "@/features/fabric/components/FabricInHand";
import { FabricDayLedger } from "@/features/fabric/components/FabricDayLedger";
import { FabricReceiptsList } from "@/features/fabric/components/FabricReceiptsList";
import { ReceiveFabricModal } from "@/features/fabric/components/ReceiveFabricModal";

const SECTION_TITLE = "text-lg font-bold text-gray-800";

export default function FabricKhataPage() {
  const k = useFabricKhata();
  const { khata } = k;
  const [editing, setEditing] = useState(null); // null = closed, {} = new receipt, receipt = edit
  const [removing, setRemoving] = useState(null);

  if (k.isLoading) return <Loader />;

  const fabricOptions = [
    { value: "", label: "All fabrics" },
    ...khata.balances.map((row) => ({ value: row.key, label: `${row.name} (${row.unit})` })),
  ];
  const holderOptions = [
    { value: "", label: "All cutting masters" },
    ...khata.holders.map((h) => ({ value: h.id, label: h.name })),
  ];
  const fabricName = khata.balances.find((row) => row.key === k.fabric)?.name ?? "All fabrics";
  const holderName = khata.holders.find((h) => h.id === k.holderId)?.name ?? "";

  const save = async (form) => {
    if (await k.saveReceipt(form)) setEditing(null);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="@container space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      data-testid="fabric-page"
    >
      <AnimatePresence>
        {editing && (
          <ReceiveFabricModal
            receipt={editing._id ? editing : null}
            balances={khata.balances}
            admin={khata.admin}
            holders={khata.holders}
            isSaving={k.isSaving}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
        {removing && (
          <ConfirmDialog
            title="Delete this receipt?"
            message={`${removing.name} · ${formatFabricQty(removing.qty, removing.unit)} · ${format(
              new Date(removing.date),
              "d MMM yyyy"
            )}`}
            confirmLabel="Delete"
            onConfirm={async () => {
              if (await k.deleteReceipt(removing._id)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="fabric-receipt-delete-confirm"
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={itemVariants}
        className="flex flex-col @2xl:flex-row @2xl:items-end @2xl:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Fabric Khata</h1>
          <p className="text-gray-500 mt-1">
            Fabric received from the store, used in cutting, and what is in hand — day by day.
          </p>
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 @2xl:flex">
          <Link href="/fabric/report" className="w-full @2xl:w-auto" data-testid="fabric-report-link">
            <Button variant="secondary" icon={ClipboardList} size="lg" className="w-full whitespace-nowrap">
              Cutting Report
            </Button>
          </Link>
          <Button
            icon={PackagePlus}
            size="lg"
            className="w-full @2xl:w-auto whitespace-nowrap"
            onClick={() => setEditing({})}
            data-testid="fabric-receive"
          >
            Receive Fabric
          </Button>
        </div>
      </motion.div>

      {khata.admin && (
        <motion.div variants={itemVariants} className="@2xl:w-72" data-testid="fabric-holder-filter">
          <SelectDropdown
            options={holderOptions}
            selected={k.holderId}
            onSelect={k.setHolderId}
            ariaLabel="Cutting master"
          />
        </motion.div>
      )}

      <motion.div className="grid grid-cols-1 @2xl:grid-cols-3 gap-4 sm:gap-6" data-testid="fabric-totals">
        <StatCard icon={PackageCheck} title="Fabric received" value={formatUnitTotals(khata.totals, "received")} />
        <StatCard icon={Scissors} title="Used in cutting" value={formatUnitTotals(khata.totals, "used")} />
        <StatCard icon={Scroll} title="Balance in hand" value={formatUnitTotals(khata.totals, "balance")} />
      </motion.div>

      <motion.section variants={itemVariants} className="space-y-3">
        <h2 className={SECTION_TITLE}>Fabric in hand</h2>
        <FabricInHand balances={khata.balances} selected={k.fabric} onSelect={k.setFabric} />
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex flex-col @4xl:flex-row @4xl:items-center @4xl:justify-between gap-3 print:hidden">
          <h2 className={SECTION_TITLE}>Day by day</h2>
          <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:flex gap-3">
            <div className="@4xl:w-60" data-testid="fabric-filter">
              <SelectDropdown
                options={fabricOptions}
                selected={k.fabric}
                onSelect={k.setFabric}
                ariaLabel="Fabric"
                portal
              />
            </div>
            <DateRangeButton
              range={k.range}
              onChange={k.setRange}
              prefix="Date"
              className="@4xl:w-64"
              testId="fabric-date-filter"
            />
            <Button
              variant="secondary"
              icon={Printer}
              className="@lg:col-span-2 whitespace-nowrap"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        </div>
        <div id="fabric-print" className={`space-y-3 transition-opacity ${k.isFetching ? "opacity-70" : ""}`}>
          <div className="hidden print:block">
            <h2 className="text-xl font-bold text-gray-800">{BRAND.name} · Fabric khata</h2>
            <p className="text-sm text-gray-600">
              {[holderName, fabricName, rangeLabel(k.range)].filter(Boolean).join(" · ")} · printed{" "}
              {new Date().toLocaleString()}
            </p>
          </div>
          <FabricDayLedger ledger={khata.ledger} />
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-3">
        <h2 className={SECTION_TITLE}>Fabric received</h2>
        <FabricReceiptsList
          receipts={khata.receipts}
          showHolder={khata.admin}
          onEdit={setEditing}
          onDelete={setRemoving}
        />
      </motion.section>
    </motion.div>
  );
}
