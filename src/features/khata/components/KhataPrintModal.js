"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { isPaid } from "@/constants/wages";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { KhataStatement } from "./KhataStatement";

const VIEWS = [
  { value: "unpaid", label: "To pay" },
  { value: "all", label: "All work" },
];

/** Preview of a worker's printable khata — what is still to pay (default) or all his work — with a Print button. */
export function KhataPrintModal({ worker, entries = [], advanceLeft = 0, onClose }) {
  const [view, setView] = useState("unpaid");
  const lines = view === "all" ? entries : entries.filter((entry) => !isPaid(entry));

  return (
    <Modal onClose={onClose} size="xl" padded={false}>
      <div className="p-2 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pr-10 print:hidden">
          <SegmentedControl
            options={VIEWS}
            value={view}
            onChange={setView}
            ariaLabel="Print"
            size="sm"
            testId="khata-print-view"
          />
          <Button icon={Printer} onClick={() => window.print()} data-testid="khata-print-button">
            Print
          </Button>
        </div>
        <div className="overflow-x-auto">
          <KhataStatement
            worker={worker}
            entries={lines}
            title={view === "all" ? "All work" : "Work to pay"}
            advanceLeft={advanceLeft}
          />
        </div>
      </div>
    </Modal>
  );
}

export default KhataPrintModal;
