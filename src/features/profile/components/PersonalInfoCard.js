"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, Edit, Save } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { InputField } from "./InputField";

/** Name / email / phone fields; read-only until "Edit" is pressed, "Save" persists them. */
export function PersonalInfoCard({ profile, isEditing, onEdit, onSave, onChange }) {
  const handleChange = (e) => onChange(e.target.name, e.target.value);

  return (
    <motion.div variants={itemVariants} className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Personal Information</h2>
        <Button size="sm" icon={isEditing ? Save : Edit} onClick={isEditing ? onSave : onEdit}>
          {isEditing ? "Save" : "Edit"}
        </Button>
      </div>
      <div className="space-y-4">
        <InputField
          icon={User}
          type="text"
          placeholder="Full Name"
          name="name"
          value={profile.name}
          onChange={handleChange}
          disabled={!isEditing}
        />
        <InputField
          icon={Mail}
          type="email"
          placeholder="Email Address"
          name="email"
          value={profile.email}
          onChange={handleChange}
          disabled={!isEditing}
        />
        <InputField
          icon={Phone}
          type="tel"
          placeholder="Phone Number"
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </div>
    </motion.div>
  );
}

export default PersonalInfoCard;
