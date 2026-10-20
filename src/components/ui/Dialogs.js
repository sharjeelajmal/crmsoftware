"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** "Are you sure?" dialog. `tone` picks the confirm button colour. */
export function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal onClose={onCancel} size="sm">
      <div className="text-center">
        <AlertTriangle className="mx-auto text-yellow-500" size={48} />
        <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">{title}</h3>
        <p className="my-4 text-md text-gray-600">{message}</p>
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Single-button information dialog (replaces window.alert). */
export function AlertDialog({ title = "Information", message, onClose }) {
  return (
    <Modal onClose={onClose} size="sm">
      <div className="text-center">
        <Info className="mx-auto text-blue-500" size={48} />
        <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">{title}</h3>
        <p className="my-4 text-md text-gray-600">{message}</p>
        <div className="flex justify-center mt-6">
          <Button onClick={onClose} className="px-8">
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}
