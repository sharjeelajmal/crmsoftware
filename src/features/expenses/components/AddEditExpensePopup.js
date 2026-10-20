"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Modal } from "@/components/ui/Modal";
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
  const [showCalendar, setShowCalendar] = useState(false);

  const handleChange = (e) => setExpense((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDateSelect = (date) => {
    if (date) setExpense((prev) => ({ ...prev, date }));
    setShowCalendar(false);
  };

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
          type="text"
          name="name"
          value={expense.name}
          onChange={handleChange}
          placeholder="Expense Name (e.g., Rent)"
          className={INPUT_CLASS}
        />
        <input
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
          type="text"
          name="note"
          value={expense.note ?? ""}
          onChange={handleChange}
          placeholder="Notes (Optional)"
          className={INPUT_CLASS}
        />
        <div className="relative">
          <input
            type="text"
            readOnly
            value={expense.date ? format(new Date(expense.date), "dd MMM, yyyy") : ""}
            onClick={() => setShowCalendar((open) => !open)}
            className={`${INPUT_CLASS} cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner`}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={handleSave}>
          {isEditing ? "Save Changes" : "Record Expense"}
        </Button>
      </div>
      {showCalendar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"
        >
          <DayPicker mode="single" selected={new Date(expense.date)} onSelect={handleDateSelect} />
        </motion.div>
      )}
    </Modal>
  );
}

export default AddEditExpensePopup;
