"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password input with a leading icon and a show/hide toggle. */
export function PasswordInputField({ icon: Icon, placeholder, value, name, onChange }) {
  const [isVisible, setIsVisible] = useState(false);
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <input
        autoComplete="new-password"
        type={isVisible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        name={name}
        onChange={onChange}
        className="w-full p-3 pl-12 pr-12 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary cursor-pointer"
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        <ToggleIcon size={20} />
      </button>
    </div>
  );
}

export default PasswordInputField;
