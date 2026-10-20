"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import { PersonalInfoCard } from "@/features/profile/components/PersonalInfoCard";
import { ChangePasswordCard } from "@/features/profile/components/ChangePasswordCard";

export default function ProfilePage() {
  const { profile, isLoading, updateField, saveProfile, updatePassword, isUpdatingPassword } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (await saveProfile()) setIsEditing(false);
  };

  // Picking a new photo switches to edit mode so the user can save it.
  const handleAvatarChange = (dataUrl) => {
    updateField("avatar", dataUrl);
    setIsEditing(true);
  };

  if (isLoading || !profile) return <Loader />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-4xl mx-auto"
    >
      <ProfileAvatar profile={profile} onAvatarChange={handleAvatarChange} />
      <PersonalInfoCard
        profile={profile}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onChange={updateField}
      />
      <ChangePasswordCard onSubmit={updatePassword} isSubmitting={isUpdatingPassword} />
    </motion.div>
  );
}
