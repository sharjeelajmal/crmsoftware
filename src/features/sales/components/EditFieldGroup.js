"use client";

/** Labelled input with optional leading icon, used by the edit-invoice popup. */
export function EditFieldGroup({ label, icon: Icon, value, onChange, type = "text", placeholder, className = "" }) {
  return (
    <div className={`relative group ${className}`}>
      <label
        className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 transition-colors
          group-focus-within:text-primary"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
            size={18}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 ${Icon ? "pl-10" : ""}
            outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm`}
        />
      </div>
    </div>
  );
}

export default EditFieldGroup;
