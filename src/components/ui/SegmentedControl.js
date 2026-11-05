"use client";

const SIZES = {
  md: "px-4 py-2 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

const ARROW_STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * A row of options of which exactly one is chosen (a view, a pay type) — the app's own, never native radio buttons.
 * `options` are `{ value, label }`. Arrow keys move the choice, like a radio group. Each option gets the test id
 * `${testId}-${value}`.
 */
export function SegmentedControl({ options, value, onChange, ariaLabel, size = "md", className = "", testId }) {
  const handleKeyDown = (event) => {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-1 p-1 bg-gray-100 rounded-xl ${className}`}
      data-testid={testId}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            data-value={option.value}
            className={
              `${SIZES[size] ?? SIZES.md} flex-1 rounded-lg font-semibold whitespace-nowrap transition-colors ` +
              "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (active ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-white")
            }
            data-testid={testId ? `${testId}-${option.value}` : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
