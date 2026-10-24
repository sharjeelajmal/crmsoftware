"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trash2 } from "lucide-react";

const SEARCH_THRESHOLD = 5;

/** Closes the dropdown when the user clicks outside every given ref (a portaled menu lives outside the wrapper). */
function useClickOutside(refs, onOutside) {
  useEffect(() => {
    const list = Array.isArray(refs) ? refs : [refs];
    const handler = (event) => {
      if (!list.some((ref) => ref.current && ref.current.contains(event.target))) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [refs, onOutside]);
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

const SELECT_SIZES = {
  md: { wrap: "relative w-full", button: "w-full p-3 rounded-xl", icon: 20, item: "px-4 py-2" },
  sm: {
    wrap: "relative inline-block",
    button: "gap-1 px-2 py-1 rounded-md text-xs",
    icon: 14,
    item: "px-3 py-1.5 text-sm",
  },
};
const MENU_MAX_HEIGHT = 240;
const MENU_MIN_WIDTH = 128;
const MENU_CLASS = "bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1";

/** Fixed-position box for a portaled menu: below the button, or above it when there is no room below. */
const menuBoxFor = (button, optionCount) => {
  const rect = button.getBoundingClientRect();
  const width = Math.max(rect.width, MENU_MIN_WIDTH);
  const below = window.innerHeight - rect.bottom;
  const needed = Math.min(MENU_MAX_HEIGHT, optionCount * 36 + 8);
  const up = below < needed && rect.top > below;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  return up
    ? { up, style: { left, minWidth: width, bottom: window.innerHeight - rect.top + 4 } }
    : { up, style: { left, minWidth: width, top: rect.bottom + 4 } };
};

/**
 * Dropdown over `{ value, label, short? }` options (vendors, products, sizes…).
 * - `size="sm"`: compact trigger for table cells (shows `short` when an option has one).
 * - `portal`: renders the menu on <body> with fixed positioning, so tables/modals with `overflow` can't clip it.
 * - Keyboard: ↑/↓ open and move, Enter/Space pick, Esc closes. The selected option is highlighted.
 */
export function SelectDropdown({
  options,
  selected,
  onSelect,
  placeholder = "Select...",
  size = "md",
  portal = false,
  className = "",
  testId,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState(null);
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();
  const styles = SELECT_SIZES[size] ?? SELECT_SIZES.md;
  const current = options.find((option) => option.value === selected);
  const buttonText = current ? (size === "sm" && current.short) || current.label : placeholder;

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActive(-1);
  }, []);
  useClickOutside([ref, menuRef], close);

  const place = useCallback(() => {
    if (buttonRef.current) setBox(menuBoxFor(buttonRef.current, options.length));
  }, [options.length]);

  // A portaled menu follows its button while anything scrolls or the window resizes.
  useEffect(() => {
    if (!isOpen || !portal) return undefined;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, portal, place]);

  const openMenu = () => {
    setIsOpen(true);
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === selected)
      )
    );
  };
  const pick = (option) => {
    onSelect(option.value);
    close();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && isOpen && options[active]) {
      event.preventDefault();
      pick(options[active]);
    }
  };

  const up = portal && box?.up;
  const menu = (
    <motion.ul
      key="menu"
      ref={menuRef}
      id={listId}
      role="listbox"
      initial={{ opacity: 0, y: up ? 8 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: up ? 8 : -8 }}
      transition={{ duration: 0.15 }}
      style={portal ? box?.style : undefined}
      className={portal ? `dropdown-portal fixed ${MENU_CLASS}` : `absolute z-10 w-full mt-2 ${MENU_CLASS}`}
    >
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(option)}
            className={`${styles.item} cursor-pointer whitespace-nowrap transition-colors ${
              isSelected ? "bg-primary text-white" : index === active ? "bg-gray-100 text-gray-800" : "text-gray-700"
            }`}
          >
            {option.label}
          </li>
        );
      })}
    </motion.ul>
  );

  return (
    <div className={`${styles.wrap} ${className}`} ref={ref} data-testid={testId}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : openMenu())}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        className={
          `${styles.button} flex items-center justify-between bg-gray-100 outline-none cursor-pointer ` +
          "focus-visible:ring-2 focus-visible:ring-primary transition-colors hover:bg-gray-200/70"
        }
      >
        <span className={`truncate ${current ? "text-gray-800" : "text-gray-400"}`}>{buttonText}</span>
        <ChevronDown
          size={styles.icon}
          className={`shrink-0 text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {portal ? (
        mounted && createPortal(<AnimatePresence>{isOpen && box && menu}</AnimatePresence>, document.body)
      ) : (
        <AnimatePresence>{isOpen && menu}</AnimatePresence>
      )}
    </div>
  );
}

export default CustomDropdown;
