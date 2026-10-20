"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useLotForm } from "../hooks/useLotForm";
import { FABRIC_UNITS } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const SECTION_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm space-y-4";
const TOTAL_CLASS =
  "flex items-center justify-between sm:justify-start gap-3 px-4 py-2 rounded-xl bg-primary-soft text-primary";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/**
 * Cutting entry form (create or edit). `lot` switches it to edit mode;
 * `onSaved(lot)` receives the saved document; `cancelHref` is where "Cancel" goes.
 */
export function LotForm({ lot = null, onSaved, cancelHref = "/cutting" }) {
  const f = useLotForm({ lot, onSaved });

  if (f.productsLoading) return <Loader text="Loading articles" />;

  return (
    // Own orchestration: this form mounts after the products load, i.e. after the page's
    // entrance animation finished, so it must animate its sections itself.
    <motion.form
      data-testid="lot-form"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      <motion.section variants={itemVariants} className={SECTION_CLASS}>
        <h2 className="text-lg font-bold text-gray-800">Article</h2>
        <div data-testid="lot-form-product">
          <SelectDropdown
            options={f.productOptions}
            selected={f.form.productId}
            onSelect={f.selectProduct}
            placeholder="Select article (product)"
          />
        </div>
        {f.product?.sizes?.length > 0 && (
          <p className="text-xs text-gray-500">
            This article has {f.product.sizes.length} sizes; rows were prefilled below.
          </p>
        )}
      </motion.section>

      <motion.section variants={itemVariants} className={SECTION_CLASS}>
        <h2 className="text-lg font-bold text-gray-800">Fabric</h2>
        <Field label="Fabric name">
          <input
            type="text"
            value={f.form.fabricName}
            onChange={(e) => f.setField("fabricName", e.target.value)}
            placeholder="e.g. Denim 12oz"
            maxLength={120}
            data-testid="lot-form-fabric-name"
            className={INPUT_CLASS}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Field label="Fabric quantity">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={f.form.fabricQty}
              onChange={(e) => f.setField("fabricQty", e.target.value)}
              placeholder="0"
              data-testid="lot-form-fabric-qty"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Unit">
            <select
              value={f.form.fabricUnit}
              onChange={(e) => f.setField("fabricUnit", e.target.value)}
              data-testid="lot-form-fabric-unit"
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              {FABRIC_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className={SECTION_CLASS}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-800">Sizes</h2>
          <div data-testid="lot-form-total" data-total={f.total} className={TOTAL_CLASS}>
            <span className="text-sm font-semibold">Total pieces</span>
            <span className="text-2xl font-bold">{f.total}</span>
          </div>
        </div>
        <SizeRowsEditor rows={f.form.sizes} onChange={f.setSizes} />
      </motion.section>

      <motion.section variants={itemVariants} className={SECTION_CLASS}>
        <Field label="Note (optional)">
          <textarea
            value={f.form.note}
            onChange={(e) => f.setField("note", e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Anything the stitching unit should know…"
            data-testid="lot-form-note"
            className={`${INPUT_CLASS} resize-y`}
          />
        </Field>
      </motion.section>

      <motion.div variants={itemVariants} className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Link href={cancelHref} className="w-full sm:w-auto">
          <Button variant="secondary" size="lg" className="w-full">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          size="lg"
          icon={Save}
          disabled={f.isSaving}
          data-testid="lot-form-submit"
          className="w-full sm:w-auto"
        >
          {f.isSaving ? "Saving…" : f.isEditing ? "Save changes" : "Save cutting entry"}
        </Button>
      </motion.div>
    </motion.form>
  );
}

export default LotForm;
