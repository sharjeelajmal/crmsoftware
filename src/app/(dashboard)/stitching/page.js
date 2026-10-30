"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Layers, Send, Shirt } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { StatCard } from "@/components/ui/StatCard";
import { useLots } from "@/features/lots/hooks/useLots";
import { StitchingRow } from "@/features/lots/components/StitchingRow";
import { DispatchModal } from "@/features/lots/components/DispatchModal";
import { GatePassModal } from "@/features/cutting/components/GatePassModal";

/**
 * Stitching unit: every lot that is in stitching, how many pieces came in, how many went out to washing
 * with gate passes, and how many are still lying ("padi hui"). Parts go out with "Gate pass out".
 */
export default function StitchingPage() {
  const { lots, summary, isLoading, isFetching, reload } = useLots("stitching");
  const [dispatchLot, setDispatchLot] = useState(null);
  const [pass, setPass] = useState(null);

  if (isLoading) return <Loader />;

  const stitching = summary?.stitching ?? { lots: 0, received: 0, out: 0, lying: 0 };

  const handleDone = async ({ pass: issued }) => {
    setDispatchLot(null);
    setPass(issued);
    await reload();
  };

  return (
    <>
      <AnimatePresence>
        {dispatchLot && <DispatchModal lot={dispatchLot} onDone={handleDone} onCancel={() => setDispatchLot(null)} />}
        {pass && <GatePassModal pass={pass} onClose={() => setPass(null)} />}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        data-testid="stitching-page"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Stitching</h1>
          <p className="text-gray-500 mt-1">
            Pieces in the stitching unit: received from cutting, sent out to washing with gate passes, and still lying.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={Layers} title="Invoices in stitching" value={stitching.lots} />
          <StatCard icon={Inbox} title="Received" value={`${stitching.received} pcs`} />
          <StatCard icon={Send} title="Sent out" value={`${stitching.out} pcs`} />
          <StatCard icon={Shirt} title="Lying (padi hui)" value={`${stitching.lying} pcs`} />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="hidden md:flex items-center gap-4 px-4 pb-2 text-sm text-gray-500 font-medium">
            <span className="flex-1">Invoice</span>
            <span className="w-80">Pieces</span>
            <span className="w-[136px]" aria-hidden="true" />
          </div>
          {isFetching && lots.length === 0 ? (
            <Loader inline />
          ) : lots.length === 0 ? (
            <p className="text-center text-gray-500 py-10" data-testid="stitching-empty">
              No invoices in stitching right now. Send an invoice to stitching from its page (Invoices → invoice → Send
              to stitching).
            </p>
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => (
                <StitchingRow key={lot._id} lot={lot} onDispatch={setDispatchLot} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
