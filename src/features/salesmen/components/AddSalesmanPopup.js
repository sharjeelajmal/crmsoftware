"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

const EMPTY_SALESMAN = {
  name: "",
  phone: "",
  secondaryPhone: "",
  address: "",
  cnic: "",
  salary: "",
  joiningDate: new Date(),
};

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/** New salesman form. `onSave(salesman)` is awaited; the parent closes the popup on success. */
export function AddSalesmanPopup({ onSave, onCancel }) {
  const toast = useToast();
  const [salesman, setSalesman] = useState(EMPTY_SALESMAN);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => setSalesman((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!salesman.name.trim() || !salesman.phone.trim() || salesman.salary === "") {
      toast.info("Name, contact number and salary are required.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(salesman);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onCancel} size="lg">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Salesman</h3>
      <div className="space-y-4">
        <input
          type="text"
          name="name"
          value={salesman.name}
          onChange={handleChange}
          placeholder="Full Name"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            name="phone"
            value={salesman.phone}
            onChange={handleChange}
            placeholder="Contact No"
            className={INPUT_CLASS}
          />
          <input
            type="tel"
            name="secondaryPhone"
            value={salesman.secondaryPhone}
            onChange={handleChange}
            placeholder="Secondary No (Optional)"
            className={INPUT_CLASS}
          />
        </div>
        <input
          type="text"
          name="address"
          value={salesman.address}
          onChange={handleChange}
          placeholder="Address"
          className={INPUT_CLASS}
        />
        <input
          type="text"
          name="cnic"
          value={salesman.cnic}
          onChange={handleChange}
          placeholder="CNIC (without dashes)"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            name="salary"
            value={salesman.salary}
            onChange={handleChange}
            placeholder="Salary"
            className={INPUT_CLASS}
          />
          <div className="relative">
            <input
              type="text"
              readOnly
              value={format(salesman.joiningDate, "dd MMM, yyyy")}
              onClick={() => setShowCalendar((open) => !open)}
              placeholder="Joining Date"
              className={`${INPUT_CLASS} cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner`}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="rounded-xl w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
          Save Salesman
        </Button>
      </div>
      {showCalendar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"
        >
          <DayPicker
            mode="single"
            selected={salesman.joiningDate}
            onSelect={(date) => {
              if (date) setSalesman((current) => ({ ...current, joiningDate: date }));
              setShowCalendar(false);
            }}
          />
        </motion.div>
      )}
    </Modal>
  );
}
