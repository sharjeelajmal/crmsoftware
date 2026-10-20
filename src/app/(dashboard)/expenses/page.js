"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, MinusCircle, Tag, Search, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { containerVariants, itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { FilterButton } from "@/components/ui/FilterButton";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { AddEditExpensePopup } from "@/features/expenses/components/AddEditExpensePopup";
import { AddCategoryPopup } from "@/features/expenses/components/AddCategoryPopup";
import { ExpenseRow } from "@/features/expenses/components/ExpenseRow";
import { DateRangeModal } from "@/features/expenses/components/DateRangeModal";
import {
  CUSTOM_FILTER,
  EMPTY_RANGE,
  PERIOD_FILTERS,
  filterExpenses,
  isCompleteRange,
  periodLabel,
  topSpendingCategory,
} from "@/features/expenses/utils";

const CLOSED = { type: null, data: null };
const ACTION_CLASS = "flex-1 sm:flex-none whitespace-nowrap";
const SEARCH_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent " +
  "focus:border-primary transition-transform duration-300";

export default function ExpensesPage() {
  const {
    expenses,
    totalAmount,
    categories,
    categoryOptions,
    isLoading,
    dateFilter,
    appliedRange,
    selectPeriod,
    applyCustomRange,
    dropIncompleteCustomRange,
    saveExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
  } = useExpenses();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [popup, setPopup] = useState(CLOSED);
  const [showCalendar, setShowCalendar] = useState(false);
  const [draftRange, setDraftRange] = useState(EMPTY_RANGE); // range being picked, applied on "Apply Range"

  const closePopup = () => setPopup(CLOSED);
  const withClose = async (promise) => {
    if (await promise) closePopup();
  };

  const confirmDeleteCategory = async () => {
    if (await deleteCategory(popup.data)) {
      setSelectedCategory("All");
      closePopup();
    }
  };

  const openCalendar = () => {
    setDraftRange(appliedRange);
    setShowCalendar(true);
  };
  const closeCalendar = () => {
    setShowCalendar(false);
    setDraftRange(appliedRange);
    dropIncompleteCustomRange();
  };
  const applyRange = () => {
    if (!isCompleteRange(draftRange)) return;
    applyCustomRange(draftRange);
    setShowCalendar(false);
  };

  const filteredExpenses = filterExpenses(expenses, { searchTerm, category: selectedCategory });
  const topCategory = topSpendingCategory(filteredExpenses);
  const isCustom = dateFilter === CUSTOM_FILTER;
  const customLabel = (
    <span className="flex items-center gap-2">
      <Calendar size={16} />
      <span>
        {isCustom && isCompleteRange(appliedRange)
          ? `${format(appliedRange.from, "dd/MM")} - ${format(appliedRange.to, "dd/MM")}`
          : "Custom"}
      </span>
    </span>
  );

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "addEditExpense" && (
          <AddEditExpensePopup
            categories={categories}
            defaultCategory={selectedCategory}
            initialData={popup.data}
            onSave={(expense) => withClose(saveExpense(expense))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "addCategory" && (
          <AddCategoryPopup onSave={(name) => name && withClose(addCategory(name))} onCancel={closePopup} />
        )}
        {popup.type === "deleteExpense" && (
          <ConfirmDialog
            title="Confirm Action"
            message="Are you sure you want to delete this expense?"
            onConfirm={() => withClose(deleteExpense(popup.data))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "deleteCategory" && (
          <ConfirmDialog
            title="Confirm Action"
            message={`Are you sure you want to delete the "${popup.data}" category?`}
            onConfirm={confirmDeleteCategory}
            onCancel={closePopup}
          />
        )}
        {showCalendar && (
          <DateRangeModal
            range={draftRange}
            onRangeChange={(range) => setDraftRange(range || EMPTY_RANGE)}
            onApply={applyRange}
            onClose={closeCalendar}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Expenses</h1>
          <p className="text-gray-500 mt-1">Record and manage all business expenditures.</p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={DollarSign}
            title={`Total Expense (${periodLabel(dateFilter)})`}
            value={formatMoney(totalAmount)}
          />
          <StatCard
            icon={Tag}
            title="Top Spending Category"
            value={`${topCategory.name} (${formatMoney(topCategory.amount)})`}
          />
          <StatCard icon={MinusCircle} title="Total Categories" value={categories.length} />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-end w-full">
          <Button icon={Tag} className={ACTION_CLASS} onClick={() => setPopup({ type: "addCategory", data: null })}>
            Add Category
          </Button>
          <Button icon={Plus} className={ACTION_CLASS} onClick={() => setPopup({ type: "addEditExpense", data: null })}>
            New Expense
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by Name or Notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={SEARCH_CLASS}
                />
              </div>
              <CustomDropdown
                label="Category"
                options={categoryOptions}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                onDeleteOption={(name) => setPopup({ type: "deleteCategory", data: name })}
                containerClassName="w-full sm:w-48"
                searchPlaceholder="Search category..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto flex-shrink-0">
              {PERIOD_FILTERS.map(({ value, label }) => (
                <FilterButton
                  key={value}
                  label={label}
                  active={dateFilter === value}
                  className="flex-1 sm:flex-none"
                  onClick={() => selectPeriod(value)}
                />
              ))}
              <FilterButton
                active={isCustom}
                onClick={openCalendar}
                label={customLabel}
                className="flex-1 sm:flex-none"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
            <span className="flex-grow">Expense Details</span>
            <span className="w-32 text-center">Amount</span>
            <span className="w-32 text-center">Date</span>
            <span className="w-40 text-center">Actions</span>
          </div>

          <motion.div variants={containerVariants} className="space-y-3 mt-4">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <ExpenseRow
                  key={expense._id}
                  expense={expense}
                  onEdit={(item) => setPopup({ type: "addEditExpense", data: item })}
                  onDelete={(id) => setPopup({ type: "deleteExpense", data: id })}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-10">No expenses found for this period.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
