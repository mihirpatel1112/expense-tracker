/**
 * Canonical grouping for descriptions (fuel variants, Wise/NRE, etc.).
 * Used by entries grouping, analysis, and custom analysis charts.
 */
export function expenseGroupKey(description: string): string {
  const normalized = description.trim().toLowerCase().replace(/\s+/g, " ");

  if (/transfer\s+to\s+(wise|nre)/i.test(normalized)) {
    return "wise nre transfer";
  }

  if (/^fuel\b/.test(normalized)) {
    return "fuel";
  }

  return normalized;
}

export function expenseGroupLabel(description: string): string {
  const key = expenseGroupKey(description);

  if (key === "wise nre transfer") {
    return "Wise / NRE transfer";
  }

  if (key === "fuel") {
    return "Fuel";
  }

  return description.trim();
}

/** Label for a canonical group key when no sample description is available. */
export function expenseGroupDisplayLabelFromKey(key: string): string {
  if (key === "wise nre transfer") {
    return "Wise / NRE transfer";
  }
  if (key === "fuel") {
    return "Fuel";
  }
  return key.trim();
}
