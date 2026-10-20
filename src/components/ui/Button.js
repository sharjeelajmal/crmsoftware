"use client";

const VARIANT_CLASS = {
  primary: "bg-primary text-white hover:opacity-90 shadow-md",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
};

const SIZE_CLASS = {
  sm: "py-2 px-4 text-sm",
  md: "py-2.5 px-6",
  lg: "py-3 px-8",
};

/**
 * Standard button. Keeps the project's look (rounded, semibold, scale on hover)
 * so pages don't repeat the same 10 utility classes everywhere.
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all " +
        "duration-300 transform hover:scale-105 cursor-pointer disabled:opacity-50 " +
        "disabled:cursor-not-allowed disabled:hover:scale-100" +
        ` ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary} ${SIZE_CLASS[size] ?? SIZE_CLASS.md} ${className}`
      }
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

export default Button;
