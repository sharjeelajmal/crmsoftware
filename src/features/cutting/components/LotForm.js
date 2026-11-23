"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PackagePlus, Plus, Save } from "lucide-react";
import { ROLES } from "@/constants/roles";
import { useRole } from "@/hooks/useRole";
import { containerVariants, itemVariants } from "@/constants/animations";
import { cutListHint, cutListOf } from "@/constants/cutLists";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { SuggestInput } from "@/components/ui/SuggestInput";
import { useFabricBalances } from "@/features/fabric/hooks/useFabricBalances";
import { FabricBalanceHint } from "@/features/fabric/components/FabricBalanceHint";
import { ReceiveFabricModal } from "@/features/fabric/components/ReceiveFabricModal";
import { fabricSuggestions } from "@/features/fabric/utils";
import { useLotForm } from "../hooks/useLotForm";
import { useCutList } from "../hooks/useCutList";
import { FABRIC_UNITS } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";
import { NewArticlePopup } from "./NewArticlePopup";

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
 * An admin can add a new article right next to the article picker (only admins may add articles). Anyone cutting can
 * receive a new fabric right next to the Fabric heading (both roles may receive fabric in the fabric khata).
 * Under the cut number: the open cut list and its last cut (editing: the invoice's own list); a new entry lets the
 * admin close the list when the fabric list is finished (client 2026-11-23: cut numbers then start again from 1).
 */
export function LotForm({ lot = null, onSaved, cancelHref = "/cutting" }) {
  const f = useLotForm({ lot, onSaved });
  const { balances, admin: fabricAdmin, holders, reload: reloadBalances } = useFabricBalances();
  const isAdmin = useRole() === ROLES.ADMIN;
  const canAddArticle = isAdmin;
  const [addingArticle, setAddingArticle] = useState(false);
  const [addingFabric, setAddingFabric] = useState(false);
  const { cutList, close: closeCutList, isClosing } = useCutList();
  const [closingList, setClosingList] = useState(false);

  if (f.productsLoading) return <Loader text="Loading articles" />;

  const listHint = lot
    ? cutListHint({ current: cutList?.current, lotList: cutListOf(lot) })
    : cutList
      ? cutListHint({ current: cutList.current, lastCutNumber: cutList.lastCutNumber })
      : "";

  return (
    <>
      {/* outside the <form>: the popups' buttons and Enter key never submit the cutting entry */}
      <AnimatePresence>
        {addingArticle && (
          <NewArticlePopup
            onSave={f.addArticle}
            onCancel={() => setAddingArticle(false)}
            isSaving={f.isAddingArticle}
          />
        )}
        {addingFabric && (
          <ReceiveFabricModal
            initial={{ name: f.form.fabricName.trim(), unit: f.form.fabricUnit }}
            balances={balances}
            admin={fabricAdmin}
            holders={holders}
            isSaving={f.isAddingFabric}
            onSave={async (input) => {
              if (await f.addFabric(input)) {
                setAddingFabric(false);
                reloadBalances();
              }
            }}
            onCancel={() => setAddingFabric(false)}
          />
        )}
        {closingList && cutList && (
          <ConfirmDialog
            title={`Close list ${cutList.current}?`}
            message={`Cut numbers start again from 1 in list ${cutList.current + 1}. Do this only when the fabric list is finished.`}
            confirmLabel={isClosing ? "Closing…" : "Close list"}
            tone="primary"
            onConfirm={async () => {
              if (isClosing) return;
              await closeCutList();
              setClosingList(false);
            }}
            onCancel={() => setClosingList(false)}
            confirmTestId="cut-list-close-confirm"
          />
        )}
      </AnimatePresence>
      {/* Own orchestration: this form mounts after the products load, i.e. after the page's
          entrance animation finished, so it must animate its sections itself. */}
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800">Article</h2>
            {canAddArticle && (
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setAddingArticle(true)}
                className="whitespace-nowrap"
                data-testid="lot-form-new-article"
              >
                New article
              </Button>
            )}
          </div>
          <div data-testid="lot-form-product">
            <SelectDropdown
              options={f.productOptions}
              selected={f.form.productId}
              onSelect={f.selectProduct}
              placeholder={
                f.productOptions.length || !canAddArticle
                  ? "Select article (product)"
                  : "No articles yet — add one with “New article”"
              }
            />
          </div>
          {f.product?.sizes?.length > 0 && (
            <p className="text-xs text-gray-500">
              This article has {f.product.sizes.length} sizes; rows were prefilled below.
            </p>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className={SECTION_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800">Fabric</h2>
            <Button
              variant="secondary"
              size="sm"
              icon={PackagePlus}
              onClick={() => setAddingFabric(true)}
              className="whitespace-nowrap"
              data-testid="lot-form-new-fabric"
            >
              New fabric
            </Button>
          </div>
          <Field label="Fabric name">
            <SuggestInput
              value={f.form.fabricName}
              onChange={(value) => f.setField("fabricName", value)}
              onPick={(option) => {
                f.setField("fabricName", option.name);
                f.setField("fabricUnit", option.unit);
              }}
              options={fabricSuggestions(balances)}
              placeholder="e.g. Denim 12oz"
              maxLength={120}
              testId="lot-form-fabric-name"
              className={INPUT_CLASS}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Field label="Fabric quantity">
              <input
                autoComplete="off"
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
              <SelectDropdown
                options={FABRIC_UNITS.map((unit) => ({ value: unit, label: unit }))}
                selected={f.form.fabricUnit}
                onSelect={(unit) => f.setField("fabricUnit", unit)}
                ariaLabel="Fabric unit"
                testId="lot-form-fabric-unit"
              />
            </Field>
          </div>
          <FabricBalanceHint
            balances={balances}
            name={f.form.fabricName}
            unit={f.form.fabricUnit}
            qty={f.form.fabricQty}
            lot={lot}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Field label="Cut number (optional)">
                <input
                  autoComplete="off"
                  type="text"
                  value={f.form.bundleNumber}
                  onChange={(e) => f.setField("bundleNumber", e.target.value)}
                  placeholder="e.g. C-12"
                  maxLength={40}
                  data-testid="lot-form-bundle"
                  className={INPUT_CLASS}
                />
              </Field>
              {listHint && (
                <p
                  className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500"
                  data-testid="lot-form-cut-list"
                  data-list={lot ? cutListOf(lot) : cutList?.current}
                >
                  <span>{listHint}</span>
                  {isAdmin && !lot && (
                    <button
                      type="button"
                      onClick={() => setClosingList(true)}
                      disabled={isClosing}
                      className="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
                      data-testid="lot-form-close-list"
                    >
                      Close list…
                    </button>
                  )}
                </p>
              )}
            </div>
            <Field label="Shrinkage (optional)">
              <input
                autoComplete="off"
                type="text"
                maxLength={40}
                value={f.form.shrinkage}
                onChange={(e) => f.setField("shrinkage", e.target.value)}
                placeholder="e.g. 2 inch"
                data-testid="lot-form-shrinkage"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <p className="text-xs text-gray-500">
            Cut number and shrinkage are printed on the cutting and stitching gate passes.
          </p>
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
          <Field label="Remarks / instructions (optional)">
            <textarea
              autoComplete="off"
              value={f.form.note}
              onChange={(e) => f.setField("note", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Instructions for this cut — shown on the daily cutting report"
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
    </>
  );
}

export default LotForm;
