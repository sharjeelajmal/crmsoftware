"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Scissors } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useToast } from "@/components/ui/ToastProvider";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

const formFrom = (cut) => ({
  ...(cut?._id ? { _id: cut._id } : {}),
  cutNumber: cut?.cutNumber ?? "",
  article: cut?.article ?? "",
  pieces: cut?.pieces ? String(cut.pieces) : "",
  date: cut?.date ? format(new Date(cut.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  note: cut?.note ?? "",
});

/**
 * Add or edit a cut of the stitching khata — the owner writes it himself when the cutting comes to stitching (the
 * cutting master does not enter it): cut number, article and how many pieces.
 */
export function CutFormPopup({ cut = null, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [form, setForm] = useState(() => formFrom(cut));
  const isEditing = Boolean(cut?._id);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.cutNumber.trim()) {
      toast.info("Please enter the cut number.");
      return;
    }
    if (form.pieces !== "" && !(Math.trunc(Number(form.pieces)) >= 0)) {
      toast.info("Pieces must be 0 or more.");
      return;
    }
    if (await onSave(form)) onCancel();
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel}>
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="cut-form">
        <h3 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800 mb-2">
          <Scissors size={22} className="text-primary" /> {isEditing ? "Edit cut" : "Add cut"}
        </h3>
        <div>
          <label htmlFor="cut-form-number" className={LABEL_CLASS}>
            Cut number
          </label>
          <input
            autoComplete="off"
            id="cut-form-number"
            type="text"
            maxLength={40}
            value={form.cutNumber}
            onChange={(e) => set("cutNumber", e.target.value)}
            placeholder="e.g. 20"
            className={INPUT_CLASS}
            data-testid="cut-form-number"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="cut-form-article" className={LABEL_CLASS}>
            Article <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="cut-form-article"
            type="text"
            maxLength={120}
            value={form.article}
            onChange={(e) => set("article", e.target.value)}
            placeholder="e.g. Baggy Pent"
            className={INPUT_CLASS}
            data-testid="cut-form-article"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cut-form-pieces" className={LABEL_CLASS}>
              Pieces cut
            </label>
            <input
              autoComplete="off"
              id="cut-form-pieces"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.pieces}
              onChange={(e) => set("pieces", e.target.value)}
              placeholder="e.g. 150"
              className={`${INPUT_CLASS} text-right`}
              data-testid="cut-form-pieces"
            />
          </div>
          <div>
            <label htmlFor="cut-form-date" className={LABEL_CLASS}>
              Date
            </label>
            <DatePickerField id="cut-form-date" value={form.date} onChange={(date) => set("date", date)} />
          </div>
        </div>
        <input
          autoComplete="off"
          type="text"
          maxLength={500}
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Note (optional)"
          className={INPUT_CLASS}
        />
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            className="w-full sm:w-auto"
            data-testid="cut-form-submit"
          >
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Add cut"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CutFormPopup;
