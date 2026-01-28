"use client"; 

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Bell, Search } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState({ name: 'Mr. Denum', avatar: '/logo.png', role: 'Admin' });

  useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/profile');
            if(res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (error) {
            console.error("Failed to fetch profile for layout:", error);
        }
    };
    fetchProfile();
  }, [pathname]);

  return (
    <div className="flex h-screen bg-[#E6E6E6]">
      <div className="flex flex-col w-64 bg-transparent flex-shrink-0">
        <div className="flex items-center pl-4 pr-4 pt-4 mb-2">
          <Image src="/logo.png" alt="Mr. Denum Logo" width={40} height={40} className="rounded-full" />
          <h1 className="ml-3 text-2xl font-bold" style={{ color: '#0D3A25' }}>Mr. Denum</h1>
        </div>
        <div className="flex-grow pl-4 pr-4 pb-4">
          <Sidebar />
        </div>
      </div>

      <main className="flex-grow flex flex-col p-6 overflow-auto min-w-0">
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Search anything..." className="pl-12 pr-4 py-3 w-80 bg-white rounded-lg border-gray-200 outline-none focus:scale-105 transition-transform duration-300" />
            </div>
            <div className="flex items-center gap-4">
                <div className="relative p-2 bg-white rounded-full cursor-pointer shadow-sm">
                    <Bell size={20} className="text-gray-600" />
                </div>
                <div className="flex items-center gap-3">
                    <Image 
                        src={profile.avatar} 
                        alt="Profile" 
                        width={48} 
                        height={48}
                        className="profile-avatar rounded-full object-cover bg-gray-200 border-2 border-white shadow-md"
                    />
                    <div>
                        <p className="font-bold text-gray-800">{profile.name}</p>
                        <p className="text-sm text-gray-500">{profile.role}</p>
                    </div>
                </div>
            </div>
        </header>

        <div className="flex-grow">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}