"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BodyPortal } from "./BodyPortal";

const MENU_MAX_HEIGHT = 240;

/** Fixed-position box under the input (or above it when there is no room below). */
const menuBoxFor = (input, count) => {
  const rect = input.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  const needed = Math.min(MENU_MAX_HEIGHT, count * 44 + 8);
  const up = below < needed && rect.top > below;
  const style = { left: rect.left, width: rect.width };
  return up
    ? { up, style: { ...style, bottom: window.innerHeight - rect.top + 4 } }
    : { up, style: { ...style, top: rect.bottom + 4 } };
};

/**
 * Text field with our own suggestion list — never the browser's autofill or <datalist>. Typing filters `options`
 * (`{ value, label, hint? }`, hint shown on the right); picking one calls `onPick(option)`. Free text is still
 * allowed: `onChange(text)` gets every keystroke. ↑/↓ move, Enter picks, Esc closes. The list is rendered on
 * <body>, so a modal or a card with `overflow` can't clip it. `testId` goes on the input itself.
 */
export function SuggestInput({
  id,
  value,
  onChange,
  onPick,
  options = [],
  placeholder,
  maxLength,
  className = "",
  testId,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState(null);
  const inputRef = useRef(null);
  const listId = useId();
  const query = String(value ?? "")
    .trim()
    .toLowerCase();
  const matches = options.filter((option) => !query || option.label.toLowerCase().includes(query));
  const showing = open && matches.length > 0;

  // While open, the list follows its input every frame: scrolling, resizing, a modal still animating in, or the form
  // growing above the field all move the input. Only an actual move re-renders.
  const count = matches.length;
  useEffect(() => {
    if (!showing) return undefined;
    let frame = 0;
    let last = "";
    const follow = () => {
      if (inputRef.current) {
        const next = menuBoxFor(inputRef.current, count);
        const key = JSON.stringify(next);
        if (key !== last) {
          last = key;
          setBox(next);
        }
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [showing, count]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = (option) => {
    onPick(option);
    close();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && showing) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!showing) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter" && showing && matches[active]) {
      event.preventDefault(); // pick, don't submit the form
      pick(matches[active]);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={showing ? listId : undefined}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        className={className}
      />
      <BodyPortal>
        <AnimatePresence>
          {showing && box && (
            <motion.ul
              key="suggestions"
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: box.up ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: box.up ? 6 : -6, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15 }}
              style={box.style}
              className="dropdown-portal fixed bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1"
              data-testid={testId ? `${testId}-menu` : undefined}
            >
              {matches.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={index === active}
                  // mousedown keeps the focus in the input, so blur doesn't close the list before the click lands
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(option)}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    index === active ? "bg-primary-soft text-primary" : "text-gray-700"
                  }`}
                  data-testid={testId ? `${testId}-option` : undefined}
                >
                  <span className="min-w-0 truncate font-medium">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-xs text-gray-500">{option.hint}</span>}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </BodyPortal>
    </>
  );
}

export default SuggestInput;
