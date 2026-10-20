"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_SUGGESTIONS = 5;

/** Text input that suggests matching products as the user types. */
export function ProductSuggestionInput({ products, value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(query);
    if (!query) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const matches = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
    setSuggestions(matches.slice(0, MAX_SUGGESTIONS));
    setIsOpen(true);
  };

  const handleSelect = (product) => {
    onSelect(product);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
        placeholder="Type to search for a product..."
        className="w-full p-3 bg-gray-100 rounded-xl outline-none"
      />
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((product) => (
              <li
                key={product._id}
                onClick={() => handleSelect(product)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {product.name}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProductSuggestionInput;
