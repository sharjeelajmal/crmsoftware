"use client";

import { useEffect, useState } from "react";

// Token name → CSS variable (globals.css). Charts/canvas ko resolved hex chahiye hoti hai,
// isliye yeh hook runtime par CSS se value parhta hai — source of truth phir bhi globals.css hai.
const TOKENS = {
  primary: "--color-primary",
  primaryHover: "--color-primary-hover",
  primaryLight: "--color-primary-light",
  primarySoft: "--color-primary-soft",
  success: "--color-success",
  successLight: "--color-success-light",
  danger: "--color-danger",
  warning: "--color-warning",
  textPrimary: "--color-text-primary",
  textSecondary: "--color-text-secondary",
  border: "--color-border",
  chart1: "--color-chart-1",
  chart2: "--color-chart-2",
  chart3: "--color-chart-3",
  chartGrid: "--color-chart-grid",
  surface: "--color-surface",
};

const readTokens = () => {
  if (typeof window === "undefined") return {};
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(TOKENS).map(([key, cssVar]) => [key, styles.getPropertyValue(cssVar).trim()])
  );
};

export const useThemeColors = () => {
  // Pehle render par (SSR / hydration) khali strings, phir effect mein actual values.
  const [colors, setColors] = useState(() => Object.fromEntries(Object.keys(TOKENS).map((key) => [key, ""])));

  useEffect(() => {
    setColors(readTokens());
  }, []);

  return colors;
};
