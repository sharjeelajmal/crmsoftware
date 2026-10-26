"use client";

import { SelectDropdown } from "./CustomDropdown";

/**
 * Month / year picker inside the calendar caption: react-day-picker's `components.Dropdown`, replaced with our
 * SelectDropdown so the calendar never shows a native <select>. The menu is portaled to <body> (class
 * `.dropdown-portal`), so a modal or popover never clips it. DayPicker reads the choice from `event.target.value`.
 */
export function CalendarDropdown({ options = [], value, onChange, "aria-label": ariaLabel }) {
  const items = options.filter((option) => !option.disabled).map(({ value: v, label }) => ({ value: v, label }));
  return (
    <SelectDropdown
      size="calendar"
      portal
      options={items}
      selected={Number(value)}
      onSelect={(next) => onChange?.({ target: { value: String(next) } })}
      ariaLabel={ariaLabel}
    />
  );
}

export default CalendarDropdown;
