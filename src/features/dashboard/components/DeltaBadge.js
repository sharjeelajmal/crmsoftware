import { Minus, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Signed % change against a named period ("vs yesterday"). Colour = direction × whether up is good, always with
 * an arrow so it never relies on colour alone. `null` means there is nothing to compare with yet.
 */
export function DeltaBadge({ value, against, upIsGood = true, onBrand = false }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${onBrand ? "bg-white/15 text-white" : "bg-surface-muted text-gray-600"}`}
          data-tip="Nothing to compare with yet"
        >
          —
        </span>
        <span className={onBrand ? "text-white/70" : "text-gray-500"}>{against}</span>
      </span>
    );
  }

  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const good = value === 0 ? null : value > 0 === upIsGood;
  const tone = onBrand
    ? "bg-white/15 text-white"
    : good === null
      ? "bg-surface-muted text-gray-600"
      : good
        ? "bg-success-soft text-success"
        : "bg-danger-soft text-danger";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${tone}`}>
        <Icon size={13} aria-hidden="true" />
        {value > 0 ? "+" : ""}
        {value}%
      </span>
      <span className={onBrand ? "text-white/70" : "text-gray-500"}>{against}</span>
    </span>
  );
}

export default DeltaBadge;
