"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trash2 } from "lucide-react";

const SEARCH_THRESHOLD = 5;

/** Closes the dropdown when the user clicks anywhere outside `ref`. */
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

/**
 * Dropdown over a list of string options (categories etc.).
 * Shows a search box automatically when there are many options.
 * `onDeleteOption(option)` adds a trash icon next to each option except "All".
 */
export function CustomDropdown({
  options,
  selected,
  onSelect,
  label,
  containerClassName = "w-48",
  buttonClassName = "bg-white",
  onDeleteOption,
  searchPlaceholder = "Search...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const ref = useRef(null);

  const close = () => {
    setIsOpen(false);
    setFilterText("");
  };
  useClickOutside(ref, close);

  const visibleOptions = options.filter((option) => option.toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className={`relative ${containerClassName}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={
          "w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 " +
          "focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer" +
          ` ${buttonClassName}`
        }
      >
        <span className="font-semibold text-gray-700">{selected === "All" && label ? label : selected}</span>
        <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {options.length > SEARCH_THRESHOLD && (
              <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="w-full p-2 text-sm bg-gray-50 rounded-md outline-none"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onSelect(option);
                    close();
                  }}
                  className={`flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    selected === option ? "bg-primary text-white" : "text-gray-700"
                  }`}
                >
                  <span>{option}</span>
                  {onDeleteOption && option !== "All" && (
                    <Trash2
                      size={16}
                      className="text-red-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        close();
                        onDeleteOption(option);
                      }}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-2">No results</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Dropdown over `{ value, label }` options (vendors, products…). */
export function SelectDropdown({ options, selected, onSelect, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setIsOpen(false));
  const current = options.find((option) => option.value === selected);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-xl outline-none cursor-pointer"
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>{current?.label || placeholder}</span>
        <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {option.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomDropdown;
