"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DatePickerField, dateToValue, valueToDate } from "@/components/ui/DatePickerField";
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
          autoComplete="off"
          type="text"
          name="name"
          value={salesman.name}
          onChange={handleChange}
          placeholder="Full Name"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            autoComplete="off"
            type="tel"
            name="phone"
            value={salesman.phone}
            onChange={handleChange}
            placeholder="Contact No"
            className={INPUT_CLASS}
          />
          <input
            autoComplete="off"
            type="tel"
            name="secondaryPhone"
            value={salesman.secondaryPhone}
            onChange={handleChange}
            placeholder="Secondary No (Optional)"
            className={INPUT_CLASS}
          />
        </div>
        <input
          autoComplete="off"
          type="text"
          name="address"
          value={salesman.address}
          onChange={handleChange}
          placeholder="Address"
          className={INPUT_CLASS}
        />
        <input
          autoComplete="off"
          type="text"
          name="cnic"
          value={salesman.cnic}
          onChange={handleChange}
          placeholder="CNIC (without dashes)"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            autoComplete="off"
            type="number"
            name="salary"
            value={salesman.salary}
            onChange={handleChange}
            placeholder="Salary"
            className={INPUT_CLASS}
          />
          <DatePickerField
            id="salesman-joining-date"
            value={dateToValue(salesman.joiningDate)}
            onChange={(value) => setSalesman((current) => ({ ...current, joiningDate: valueToDate(value) }))}
            placeholder="Joining Date"
            testId="salesman-joining-date"
          />
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="rounded-xl w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
          Save Salesman
        </Button>
      </div>
    </Modal>
  );
}
