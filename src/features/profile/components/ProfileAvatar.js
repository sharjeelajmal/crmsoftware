"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { BRAND } from "@/constants/brand";
import { roleLabel } from "@/constants/roles";

const OVERLAY_CLASS =
  "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white " +
  "opacity-0 group-hover:opacity-100 transition-opacity";

/** Avatar with hover-to-change overlay; `onAvatarChange` receives the picked image as a data URL. */
export function ProfileAvatar({ profile, onAvatarChange }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onAvatarChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div variants={itemVariants} className="flex flex-col items-center">
      <div className="relative group">
        <Image
          src={profile.avatar || BRAND.logo}
          alt="Profile"
          width={120}
          height={120}
          className="rounded-full shadow-lg border-4 border-white object-cover w-32 h-32"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Change profile photo"
          className={OVERLAY_CLASS}
        >
          <Camera size={32} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-4 break-words">{profile.name}</h1>
      <span
        data-testid="profile-role"
        className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-soft text-primary"
      >
        {roleLabel(profile.role)}
      </span>
    </motion.div>
  );
}

export default ProfileAvatar;
