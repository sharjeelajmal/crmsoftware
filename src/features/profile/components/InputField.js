"use client";

const INPUT_CLASS =
  "w-full p-3 pl-12 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all " +
  "disabled:bg-gray-200 disabled:cursor-not-allowed";

/** Text input with a leading icon. */
export function InputField({ icon: Icon, type, placeholder, value, name, onChange, disabled = false }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        name={name}
        onChange={onChange}
        disabled={disabled}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export default InputField;
