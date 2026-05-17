import { assertDatabaseUrl, sql } from "@/lib/db";

type MoneyValue = number | string | null;

type MonthTotalRow = {
  month_key: string;
  spent: MoneyValue;
  received: MoneyValue;
};

type ChartRow = {
  label: string;
  spent: MoneyValue;
  received: MoneyValue;
};

type EntryRow = {
  id: number;
  date: string;
  spent: MoneyValue;
  received: MoneyValue;
  description: string;
};

type MonthOption = {
  monthKey: string;
  label: string;
  spent: number;
  received: number;
};

type ChartPoint = {
  label: string;
  spent: number;
  received: number;
  net: number;
};

type ExpenseEntry = {
  id: number;
  date: string;
  spent: number;
  received: number;
  description: string;
  count: number;
};

type AnalysisItem = {
  label: string;
  spent: number;
  received: number;
  count: number;
};

type RemittanceAnalysis = {
  count: number;
  totalAud: number;
  totalInr: number;
  averageRate: number | null;
};

type FuelReading = {
  date: string;
  description: string;
  odometerKm: number;
  litres: number;
};

export type DashboardData = {
  selectedMonth: string | null;
  selectedMonthLabel: string;
  selectedEntriesMonth: string;
  selectedEntriesLabel: string;
  selectedAnalysisMonth: string;
  selectedAnalysisLabel: string;
  months: MonthOption[];
  allTime: { spent: number; received: number; net: number };
  selectedTotals: { spent: number; received: number; net: number };
  dailyChart: ChartPoint[];
  monthlyChart: ChartPoint[];
  recentEntries: ExpenseEntry[];
  groupedEntries: ExpenseEntry[];
  analysis: {
    averageMonthlySpent: number;
    averageMonthlyReceived: number;
    averageMonthlyNet: number;
    topExpenses: AnalysisItem[];
    frequentEntries: AnalysisItem[];
    fuel: {
      averageLitresPer100Km: number | null;
      averageKmPerLitre: number | null;
      totalDistanceKm: number;
      totalLitres: number;
      sampleCount: number;
      readings: FuelReading[];
    };
    remittance: RemittanceAnalysis;
  };
};

function toMoney(value: MoneyValue) {
  return Number(value ?? 0);
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function mapEntry(row: EntryRow): ExpenseEntry {
  return {
    id: row.id,
    date: row.date,
    spent: toMoney(row.spent),
    received: toMoney(row.received),
    description: row.description,
    count: 1,
  };
}

function normalizeDescription(description: string) {
  const normalized = description.trim().toLowerCase().replace(/\s+/g, " ");

  if (/transfer\s+to\s+(wise|nre)/i.test(normalized)) {
    return "wise nre transfer";
  }

  // All fuel rows (with or without odometer / litres) share one group for breakdowns.
  if (/^fuel\b/.test(normalized)) {
    return "fuel";
  }

  return normalized;
}

function groupLabel(description: string) {
  const key = normalizeDescription(description);

  if (key === "wise nre transfer") {
    return "Wise / NRE transfer";
  }

  if (key === "fuel") {
    return "Fuel";
  }

  return description;
}

function groupEntries(rows: EntryRow[]) {
  const grouped = new Map<string, ExpenseEntry>();

  for (const row of rows) {
    const key = normalizeDescription(row.description);
    const existing = grouped.get(key);

    if (existing) {
      existing.count += 1;
      existing.spent += toMoney(row.spent);
      existing.received += toMoney(row.received);
      continue;
    }

    grouped.set(key, {
      ...mapEntry(row),
      description: groupLabel(row.description),
    });
  }

  return [...grouped.values()].sort((a, b) => b.spent - a.spent);
}

function parseFuelReading(row: EntryRow): FuelReading | null {
  const match = row.description.match(
    /fuel\s+(\d+(?:\.\d+)?)\s*km\s+(\d+(?:\.\d+)?)\s*l/i,
  );

  if (!match) {
    return null;
  }

  return {
    date: row.date,
    description: row.description,
    odometerKm: Number(match[1]),
    litres: Number(match[2]),
  };
}

function buildFuelAnalysis(rows: EntryRow[]) {
  const readings = rows
    .map(parseFuelReading)
    .filter((reading): reading is FuelReading => reading !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometerKm - b.odometerKm);
  let totalDistanceKm = 0;
  let totalLitres = 0;
  let sampleCount = 0;

  for (let index = 1; index < readings.length; index += 1) {
    const previous = readings[index - 1];
    const current = readings[index];
    const distanceKm = current.odometerKm - previous.odometerKm;

    if (distanceKm <= 0) {
      continue;
    }

    totalDistanceKm += distanceKm;
    totalLitres += current.litres;
    sampleCount += 1;
  }

  return {
    averageLitresPer100Km:
      totalDistanceKm > 0 ? (totalLitres / totalDistanceKm) * 100 : null,
    averageKmPerLitre: totalLitres > 0 ? totalDistanceKm / totalLitres : null,
    totalDistanceKm,
    totalLitres,
    sampleCount,
    readings,
  };
}

function buildRemittanceAnalysis(rows: EntryRow[]): RemittanceAnalysis {
  const remittanceRows = rows.filter(
    (row) => normalizeDescription(row.description) === "wise nre transfer",
  );
  const totalAud = remittanceRows.reduce(
    (total, row) => total + toMoney(row.spent),
    0,
  );
  const totalInr = remittanceRows.reduce((total, row) => {
    const match = row.description.match(/([\d,]+(?:\.\d+)?)\s*rupees?/i);
    return total + (match ? Number(match[1].replace(/,/g, "")) : 0);
  }, 0);

  return {
    count: remittanceRows.length,
    totalAud,
    totalInr,
    averageRate: totalAud > 0 && totalInr > 0 ? totalInr / totalAud : null,
  };
}

function buildAnalysis(months: MonthOption[], rows: EntryRow[]) {
  const monthCount = Math.max(months.length, 1);
  const totals = months.reduce(
    (result, month) => ({
      spent: result.spent + month.spent,
      received: result.received + month.received,
    }),
    { spent: 0, received: 0 },
  );
  const grouped = groupEntries(rows);

  return {
    averageMonthlySpent: totals.spent / monthCount,
    averageMonthlyReceived: totals.received / monthCount,
    averageMonthlyNet: (totals.received - totals.spent) / monthCount,
    topExpenses: grouped
      .filter((entry) => entry.spent > 0)
      .slice(0, 5)
      .map((entry) => ({
        label: entry.description,
        spent: entry.spent,
        received: entry.received,
        count: entry.count,
      })),
    frequentEntries: grouped
      .filter((entry) => entry.count > 1)
      .sort((a, b) => b.count - a.count || b.spent - a.spent)
      .slice(0, 5)
      .map((entry) => ({
        label: entry.description,
        spent: entry.spent,
        received: entry.received,
        count: entry.count,
      })),
    fuel: buildFuelAnalysis(rows),
    remittance: buildRemittanceAnalysis(rows),
  };
}

export async function getDashboardData(
  requestedMonth?: string,
  requestedEntriesMonth?: string,
  requestedAnalysisMonth?: string,
): Promise<DashboardData> {
  assertDatabaseUrl();

  const monthRows = await sql<MonthTotalRow[]>`
    select
      month_key::text as month_key,
      coalesce(sum(spent), 0) as spent,
      coalesce(sum(received), 0) as received
    from expense_entries
    group by month_key
    order by month_key desc
  `;

  const months = monthRows.map((row) => ({
    monthKey: row.month_key,
    label: monthLabel(row.month_key),
    spent: toMoney(row.spent),
    received: toMoney(row.received),
  }));

  const selectedMonth =
    months.find((month) => month.monthKey === requestedMonth)?.monthKey ??
    months[0]?.monthKey ??
    null;
  const selectedEntriesMonth =
    requestedEntriesMonth && requestedEntriesMonth !== "all"
      ? months.find((month) => month.monthKey === requestedEntriesMonth)
          ?.monthKey ?? "all"
      : "all";
  const selectedEntriesLabel =
    selectedEntriesMonth === "all" ? "All entries" : monthLabel(selectedEntriesMonth);
  const selectedAnalysisMonth =
    requestedAnalysisMonth && requestedAnalysisMonth !== "all"
      ? months.find((month) => month.monthKey === requestedAnalysisMonth)
          ?.monthKey ?? "all"
      : "all";
  const selectedAnalysisLabel =
    selectedAnalysisMonth === "all"
      ? "All months"
      : monthLabel(selectedAnalysisMonth);

  const allTime = months.reduce(
    (totals, month) => ({
      spent: totals.spent + month.spent,
      received: totals.received + month.received,
    }),
    { spent: 0, received: 0 },
  );

  if (!selectedMonth) {
    return {
      selectedMonth,
      selectedMonthLabel: "No uploads yet",
      selectedEntriesMonth: "all",
      selectedEntriesLabel: "All entries",
      selectedAnalysisMonth: "all",
      selectedAnalysisLabel: "All months",
      months,
      allTime: { ...allTime, net: allTime.received - allTime.spent },
      selectedTotals: { spent: 0, received: 0, net: 0 },
      dailyChart: [],
      monthlyChart: [],
      recentEntries: [],
      groupedEntries: [],
      analysis: {
        averageMonthlySpent: 0,
        averageMonthlyReceived: 0,
        averageMonthlyNet: 0,
        topExpenses: [],
        frequentEntries: [],
        fuel: {
          averageLitresPer100Km: null,
          averageKmPerLitre: null,
          totalDistanceKm: 0,
          totalLitres: 0,
          sampleCount: 0,
          readings: [],
        },
        remittance: {
          count: 0,
          totalAud: 0,
          totalInr: 0,
          averageRate: null,
        },
      },
    };
  }

  const selectedTotals = months.find(
    (month) => month.monthKey === selectedMonth,
  ) ?? { spent: 0, received: 0 };

  const entryRowsPromise =
    selectedEntriesMonth === "all"
      ? sql<EntryRow[]>`
          select
            id,
            to_char(transaction_date, 'YYYY-MM-DD') as date,
            spent,
            received,
            description
          from expense_entries
          order by transaction_date desc, id desc
        `
      : sql<EntryRow[]>`
          select
            id,
            to_char(transaction_date, 'YYYY-MM-DD') as date,
            spent,
            received,
            description
          from expense_entries
          where month_key = ${selectedEntriesMonth}
          order by transaction_date desc, id desc
        `;

  const [dailyRows, monthlyRows, entryRows, allEntryRows] = await Promise.all([
    sql<ChartRow[]>`
      select
        to_char(transaction_date, 'DD Mon') as label,
        coalesce(sum(spent), 0) as spent,
        coalesce(sum(received), 0) as received
      from expense_entries
      where month_key = ${selectedMonth}
      group by transaction_date
      order by transaction_date
    `,
    sql<ChartRow[]>`
      select
        month_key::text as label,
        coalesce(sum(spent), 0) as spent,
        coalesce(sum(received), 0) as received
      from expense_entries
      group by month_key
      order by month_key
    `,
    entryRowsPromise,
    sql<EntryRow[]>`
      select
        id,
        to_char(transaction_date, 'YYYY-MM-DD') as date,
        spent,
        received,
        description
      from expense_entries
      order by transaction_date desc, id desc
    `,
  ]);

  return {
    selectedMonth,
    selectedMonthLabel: monthLabel(selectedMonth),
    selectedEntriesMonth,
    selectedEntriesLabel,
    selectedAnalysisMonth,
    selectedAnalysisLabel,
    months,
    allTime: { ...allTime, net: allTime.received - allTime.spent },
    selectedTotals: {
      spent: selectedTotals.spent,
      received: selectedTotals.received,
      net: selectedTotals.received - selectedTotals.spent,
    },
    dailyChart: dailyRows.map((row) => ({
      label: row.label,
      spent: toMoney(row.spent),
      received: toMoney(row.received),
      net: toMoney(row.received) - toMoney(row.spent),
    })),
    monthlyChart: monthlyRows.map((row) => ({
      label: monthLabel(row.label),
      spent: toMoney(row.spent),
      received: toMoney(row.received),
      net: toMoney(row.received) - toMoney(row.spent),
    })),
    recentEntries: entryRows.map(mapEntry),
    groupedEntries: groupEntries(entryRows),
    analysis: buildAnalysis(
      selectedAnalysisMonth === "all"
        ? months
        : months.filter((month) => month.monthKey === selectedAnalysisMonth),
      selectedAnalysisMonth === "all"
        ? allEntryRows
        : allEntryRows.filter((row) => row.date.startsWith(selectedAnalysisMonth)),
    ),
  };
}
