"use client";

import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GatePassDocument } from "./GatePassDocument";

/** Gate pass preview with a Print button (the print CSS keeps only `#gate-pass-print` visible). */
export function GatePassModal({ pass, onClose }) {
  return (
    <Modal onClose={onClose} size="lg" padded={false}>
      <div className="p-2 sm:p-4">
        <GatePassDocument pass={pass} />
        <div className="flex justify-end mt-2 print:hidden">
          <Button icon={Printer} onClick={() => window.print()} data-testid="gate-pass-print-button">
            Print
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default GatePassModal;
