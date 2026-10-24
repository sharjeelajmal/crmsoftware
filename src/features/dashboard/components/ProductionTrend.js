"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn, Table2, TrendingUp } from "lucide-react";
import { compactNumber, niceTicks } from "@/constants/dashboard";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Panel, PanelEmpty } from "./Panel";

// Two series, one axis (both are pieces). Colours are categorical slots 1 and 3 (validated pair).
const SERIES = [
  { key: "cut", label: "Pieces cut", color: "chart1", swatch: "bg-chart-1" },
  { key: "produced", label: "Ready into stock", color: "chart3", swatch: "bg-chart-3" },
];

const VIEWS = [
  { value: "chart", label: "Chart", icon: ChartColumn },
  { value: "table", label: "Table", icon: Table2 },
];

const dayLabel = (key) => format(parseISO(key), "d MMM");

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white/95 backdrop-blur px-3 py-2 shadow-overlay text-xs min-w-36">
      <p className="font-semibold text-gray-500 mb-1.5">{format(parseISO(label), "EEE, d MMM")}</p>
      {SERIES.map((series) => {
        const row = payload.find((item) => item.dataKey === series.key);
        return (
          <p key={series.key} className="flex items-center gap-2 py-0.5">
            <span className={`w-3 h-0.5 rounded-full ${series.swatch}`} aria-hidden="true" />
            <span className="font-bold text-gray-800 tabular-nums">{(row?.value ?? 0).toLocaleString("en-US")}</span>
            <span className="text-gray-500">{series.label}</span>
          </p>
        );
      })}
    </div>
  );
}

function ViewSwitch({ view, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-muted p-0.5" role="group" aria-label="Show as chart or table">
      {VIEWS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer " +
            (view === value ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700")
          }
          data-testid={`dash-view-${value}`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Pieces cut vs pieces that went into stock per day. Every value is also in the table view (and the legend
 * carries the 14-day totals), so the chart never hides a number behind hover.
 */
export function ProductionTrend({ trend, className = "" }) {
  const [view, setView] = useState("chart");
  const colors = useThemeColors();
  const totals = Object.fromEntries(SERIES.map((s) => [s.key, trend.reduce((sum, day) => sum + day[s.key], 0)]));
  const empty = trend.every((day) => day.cut === 0 && day.produced === 0);
  const values = trend.flatMap((day) => SERIES.map((s) => day[s.key]));
  const ticks = niceTicks(Math.min(...values), Math.max(...values));

  return (
    <Panel
      icon={TrendingUp}
      title="Production trend"
      subtitle={`Last ${trend.length} days`}
      action={<ViewSwitch view={view} onChange={setView} />}
      className={className}
      testId="dash-trend"
    >
      <ul className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${series.swatch}`} aria-hidden="true" />
            <span className="text-xs text-gray-500">{series.label}</span>
            <span className="text-sm font-bold text-gray-800">{totals[series.key].toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>

      {view === "chart" ? (
        <div className="relative h-64 sm:h-72">
          {empty && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <div className="rounded-xl bg-white/90 px-4">
                <PanelEmpty
                  icon={TrendingUp}
                  title="No production yet"
                  hint="Cutting entries and ready lots will show up here day by day."
                />
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={colors.chartGrid} />
              <XAxis
                dataKey="date"
                tickFormatter={dayLabel}
                tickLine={false}
                axisLine={{ stroke: colors.border }}
                tick={{ fontSize: 11, fill: colors.textSecondary }}
                minTickGap={16}
                tickMargin={8}
              />
              <YAxis
                ticks={ticks}
                domain={[ticks[0], ticks.at(-1)]}
                interval={0}
                allowDecimals={false}
                tickFormatter={compactNumber}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: colors.textSecondary }}
                width={44}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: colors.primarySoft, opacity: 0.6 }} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={colors[series.color]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={14}
                  animationDuration={900}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 sm:h-72 overflow-y-auto rounded-xl border border-border/70" data-testid="dash-trend-table">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-muted text-xs text-gray-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Day</th>
                {SERIES.map((series) => (
                  <th key={series.key} className="text-right font-semibold px-3 py-2">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...trend].reverse().map((day) => (
                <tr key={day.date} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-gray-700">{format(parseISO(day.date), "EEE, d MMM")}</td>
                  {SERIES.map((series) => (
                    <td key={series.key} className="px-3 py-1.5 text-right font-semibold text-gray-800">
                      {day[series.key].toLocaleString("en-US")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default ProductionTrend;
