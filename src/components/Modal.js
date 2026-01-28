"use client";
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ children, onCancel }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md relative">
            <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><X size={24} /></button>
            <div className="p-8">{children}</div>
        </motion.div>
    </motion.div>
);