"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DatePickerField, dateToValue, valueToDate } from "@/components/ui/DatePickerField";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

// New expenses start on the category the list is filtered by, else the first category.
const pickInitialCategory = (defaultCategory, categories) =>
  (defaultCategory !== "All" && defaultCategory) || categories[0] || "Others";

/** Record a new expense or edit an existing one (`initialData` with `_id`). `categories` excludes "All". */
export function AddEditExpensePopup({ categories, defaultCategory, initialData = null, onSave, onCancel }) {
  const toast = useToast();
  const isEditing = Boolean(initialData);
  const [expense, setExpense] = useState(
    initialData || { name: "", category: pickInitialCategory(defaultCategory, categories), note: "", date: new Date() }
  );
  // Kept as text so the user can clear the field while typing.
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");

  const handleChange = (e) => setExpense((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (!expense.name || !amount || !expense.category) {
      toast.info("Please fill all required fields.");
      return;
    }
    onSave({ ...expense, amount: parseFloat(amount) || 0 });
  };

  return (
    <Modal onClose={onCancel} size="md">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {isEditing ? "Edit Expense" : "Record New Expense"}
      </h3>
      <div className="space-y-4">
        <input
          autoComplete="off"
          type="text"
          name="name"
          value={expense.name}
          onChange={handleChange}
          placeholder="Expense Name (e.g., Rent)"
          className={INPUT_CLASS}
        />
        <input
          autoComplete="off"
          type="number"
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (in Rupees)"
          className={INPUT_CLASS}
        />
        <CustomDropdown
          options={categories}
          selected={expense.category}
          onSelect={(category) => setExpense((prev) => ({ ...prev, category }))}
          label="Select Category"
          containerClassName="w-full"
          buttonClassName="bg-gray-100"
          searchPlaceholder="Search category..."
        />
        <input
          autoComplete="off"
          type="text"
          name="note"
          value={expense.note ?? ""}
          onChange={handleChange}
          placeholder="Notes (Optional)"
          className={INPUT_CLASS}
        />
        <DatePickerField
          id="expense-date"
          value={dateToValue(expense.date)}
          onChange={(value) => setExpense((prev) => ({ ...prev, date: valueToDate(value) }))}
          testId="expense-date"
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={handleSave}>
          {isEditing ? "Save Changes" : "Record Expense"}
        </Button>
      </div>
    </Modal>
  );
}

export default AddEditExpensePopup;
