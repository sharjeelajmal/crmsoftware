"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2 } from 'lucide-react';

export const CustomDropdown = ({ options, selected, onSelect, label, containerClassName = "w-48", buttonClassName = "bg-white", onDeleteCategory }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`relative ${containerClassName}`}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D3A25] cursor-pointer ${buttonClassName}`}>
                <span className="font-semibold text-gray-700">{selected === 'All' && label ? label : selected}</span>
                <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                        {options.map(option => (
                            <div key={option} onClick={() => { onSelect(option); setIsOpen(false); }} className={`flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100 ${selected === option ? 'bg-[#0D3A25] text-white' : 'text-gray-700'}`}>
                                <span>{option}</span>
                                {onDeleteCategory && option !== 'All' && (<Trash2 size={16} className="text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDeleteCategory(option); }}/>)}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};