"use client";

import Image from "next/image";
import { Bell, Menu, Search } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { roleLabel } from "@/constants/roles";

/** Top bar of the dashboard shell: menu button (mobile), search box, bell and the signed-in profile. */
export function DashboardHeader({ profile, onOpenMenu }) {
  return (
    <header className="flex justify-between items-center gap-3 mb-4 sm:mb-6 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="lg:hidden p-2.5 bg-white rounded-lg shadow-sm text-gray-700 hover:text-primary transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <div className="relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoComplete="off"
            type="text"
            placeholder="Search anything..."
            className={
              "pl-12 pr-4 py-3 w-56 lg:w-80 bg-white rounded-lg border-gray-200 outline-none focus:scale-105 " +
              "transition-transform duration-300"
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="relative p-2 bg-white rounded-full cursor-pointer shadow-sm">
          <Bell size={20} className="text-gray-600" />
        </div>
        <div className="flex items-center gap-3">
          <Image
            src={profile?.avatar || BRAND.logo}
            alt="Profile"
            width={48}
            height={48}
            className="profile-avatar rounded-full object-cover bg-gray-200 border-2 border-white shadow-md"
          />
          <div className="hidden sm:block">
            <p className="font-bold text-gray-800 leading-tight">{profile?.name || BRAND.name}</p>
            <p className="text-sm text-gray-500" data-testid="header-role">
              {profile?.role ? roleLabel(profile.role) : "\u00a0"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
