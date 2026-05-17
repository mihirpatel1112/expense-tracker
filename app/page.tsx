import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { redirect } from "next/navigation";
import { logout, uploadExpenseCsv } from "@/app/actions";
import {
  MonthlyExpenseChart,
  NetTotalChart,
  SpendingBreakdownChart,
} from "@/components/expense-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { isAuthenticated } from "@/lib/auth";
import { getDashboardData, type DashboardData } from "@/lib/expenses";

type SearchParams = Promise<{
  month?: string;
  upload?: string;
  rows?: string;
  error?: string;
  tab?: string;
  entriesMonth?: string;
  groupEntries?: string;
  analysisMonth?: string;
}>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits,
  }).format(value);
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function emptyDashboard(): DashboardData {
  return {
    selectedMonth: null,
    selectedMonthLabel: "No uploads yet",
    selectedEntriesMonth: "all",
    selectedEntriesLabel: "All entries",
    selectedAnalysisMonth: "all",
    selectedAnalysisLabel: "All months",
    months: [],
    allTime: { spent: 0, received: 0, net: 0 },
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

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-w-0 items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="mt-2 wrap-break-word text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div
          className="flex size-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-black sm:flex-none sm:px-5"
          : "flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white sm:flex-none sm:px-5"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const params = await searchParams;
  let setupMissing = false;
  let dashboard: DashboardData;
  const activeTab =
    params.tab === "entries" || params.tab === "analysis"
      ? params.tab
      : "overview";

  try {
    dashboard = await getDashboardData(
      undefined,
      params.entriesMonth,
      params.analysisMonth,
    );
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    setupMissing = true;
    dashboard = emptyDashboard();
  }

  const tabHref = (tab: string) => {
    const query = new URLSearchParams();

    query.set("tab", tab);

    if (tab === "entries" && params.entriesMonth) {
      query.set("entriesMonth", params.entriesMonth);
    }

    if (tab === "entries" && params.groupEntries) {
      query.set("groupEntries", params.groupEntries);
    }

    if (tab === "analysis" && params.analysisMonth) {
      query.set("analysisMonth", params.analysisMonth);
    }

    return `/?${query.toString()}`;
  };
  const groupEntries = params.groupEntries === "1";
  const entries = groupEntries ? dashboard.groupedEntries : dashboard.recentEntries;
  const analysisMonthlyChart =
    dashboard.selectedAnalysisMonth === "all"
      ? dashboard.monthlyChart
      : dashboard.monthlyChart.filter(
          (month) => month.label === dashboard.selectedAnalysisLabel,
        );
  const topExpenseChart = dashboard.analysis.topExpenses.map((item) => ({
    label: item.label,
    value: item.spent,
  }));
  const entriesHref = (group: boolean) => {
    const query = new URLSearchParams();
    query.set("tab", "entries");
    query.set("entriesMonth", dashboard.selectedEntriesMonth);

    if (group) {
      query.set("groupEntries", "1");
    }

    return `/?${query.toString()}`;
  };

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(48,209,88,0.2),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(10,132,255,0.16),transparent_28%),radial-gradient(circle_at_55%_90%,rgba(255,45,85,0.14),transparent_32%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#30d158]">
              Private Finance
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">
              Expense Tracker
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Upload one monthly CSV and track spent, received, and net totals
              without spreadsheet noise.
            </p>
          </div>

          <form action={logout} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" type="submit" variant="ghost">
              Log out
            </Button>
          </form>
        </header>

        {setupMissing ? (
          <Card className="border-[#ff9f0a]/30 bg-[#ff9f0a]/10">
            <CardContent className="p-5 text-sm text-[#ffd60a]">
              Database tables are not created yet. Run{" "}
              <code className="rounded bg-black/40 px-2 py-1 text-white">
                scripts/setup-db.sql
              </code>{" "}
              against your Postgres database first.
            </CardContent>
          </Card>
        ) : null}

        {params.upload === "success" ? (
          <Card className="border-[#30d158]/30 bg-[#30d158]/10">
            <CardContent className="p-5 text-sm text-[#30d158]">
              Imported {params.rows ?? "0"} rows successfully.
            </CardContent>
          </Card>
        ) : null}

        {params.error ? (
          <Card className="border-[#ff453a]/30 bg-[#ff453a]/10">
            <CardContent className="p-5 text-sm text-[#ff453a]">
              {params.error}
            </CardContent>
          </Card>
        ) : null}

        <nav className="grid w-full grid-cols-3 gap-2 rounded-4xl border border-white/10 bg-[#1c1c1e]/70 p-2 backdrop-blur sm:flex sm:overflow-x-auto">
          <TabLink active={activeTab === "overview"} href={tabHref("overview")}>
            Overview
          </TabLink>
          <TabLink active={activeTab === "entries"} href={tabHref("entries")}>
            Entries
          </TabLink>
          <TabLink active={activeTab === "analysis"} href={tabHref("analysis")}>
            Analysis
          </TabLink>
        </nav>

        {activeTab === "overview" ? (
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud className="text-[#30d158]" size={22} />
                  Upload Monthly CSV
                </CardTitle>
                <p className="text-sm text-zinc-400">
                  Save a month of expenses into Postgres. Required columns:
                  Date, Spent, Received, Description.
                </p>
              </CardHeader>
              <CardContent>
                <form
                  action={uploadExpenseCsv}
                  className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
                >
                  <div className="min-w-0">
                    <Label htmlFor="file">CSV file</Label>
                    <input
                      accept=".csv,text/csv"
                      className="mt-2 h-14 w-full rounded-3xl border border-white/10 bg-white/6 px-3 py-2 text-base leading-none text-white outline-none transition file:mr-4 file:h-10 file:rounded-2xl file:border-0 file:bg-white file:px-5 file:text-sm file:font-semibold file:leading-10 file:text-black focus:border-[#30d158] focus:ring-4 focus:ring-[#30d158]/15"
                      id="file"
                      name="file"
                      required
                      type="file"
                    />
                  </div>
                  <Button className="h-14 w-full px-7 lg:w-auto" type="submit" variant="health">
                    <UploadCloud size={18} />
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                accent="#ff2d55"
                icon={<ArrowUpCircle size={24} />}
                label="All-time spent"
                value={formatCurrency(dashboard.allTime.spent)}
              />
              <StatCard
                accent="#30d158"
                icon={<ArrowDownCircle size={24} />}
                label="All-time received"
                value={formatCurrency(dashboard.allTime.received)}
              />
              <StatCard
                accent="#0a84ff"
                icon={<Wallet size={24} />}
                label="All-time net"
                value={formatCurrency(dashboard.allTime.net)}
              />
            </div>
          </section>
        ) : null}

        {activeTab === "entries" ? (
          <section className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Entry Filter</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Show all rows, or only rows from one month.
                  </p>
                </div>
                <form className="grid w-full gap-3 lg:w-auto lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
                  <input name="tab" type="hidden" value="entries" />
                  {groupEntries ? (
                    <input name="groupEntries" type="hidden" value="1" />
                  ) : null}
                  <div>
                    <Label htmlFor="entriesMonth">Rows to show</Label>
                    <div className="relative mt-2">
                      <select
                        className="h-14 w-full appearance-none rounded-3xl border border-white/10 bg-white/6 px-5 pr-12 text-base text-white outline-none transition focus:border-[#30d158] focus:ring-4 focus:ring-[#30d158]/15 disabled:opacity-50"
                        defaultValue={dashboard.selectedEntriesMonth}
                        disabled={dashboard.months.length === 0}
                        id="entriesMonth"
                        name="entriesMonth"
                      >
                        <option className="bg-[#1c1c1e]" value="all">
                          All
                        </option>
                        {dashboard.months.map((month) => (
                          <option
                            className="bg-[#1c1c1e]"
                            key={month.monthKey}
                            value={month.monthKey}
                          >
                            {month.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={20}
                      />
                    </div>
                  </div>
                  <Button className="h-14 w-full px-7 lg:w-auto" type="submit" variant="ghost">
                    View
                  </Button>
                </form>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Entries</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Showing {entries.length}{" "}
                    {groupEntries ? "grouped rows" : "rows"} for{" "}
                    {dashboard.selectedEntriesLabel}.
                  </p>
                </div>
                <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
                  <Link
                    className={
                      !groupEntries
                        ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                        : "rounded-full px-4 py-2 text-sm font-semibold text-zinc-400"
                    }
                    href={entriesHref(false)}
                  >
                    Detailed
                  </Link>
                  <Link
                    className={
                      groupEntries
                        ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                        : "rounded-full px-4 py-2 text-sm font-semibold text-zinc-400"
                    }
                    href={entriesHref(true)}
                  >
                    Grouped
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 lg:grid-cols-2">
                  {entries.length === 0 ? (
                    <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500 lg:col-span-2">
                      No entries yet.
                    </p>
                  ) : (
                    entries.map((entry) => (
                      <div
                        className="flex items-center justify-between gap-4 rounded-3xl bg-white/4 p-4"
                        key={entry.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {groupEntries && entry.count > 1
                              ? `${entry.count} x ${entry.description}`
                              : entry.description}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {groupEntries
                              ? `${entry.count} transaction${
                                  entry.count === 1 ? "" : "s"
                                }`
                              : entry.date}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-[#ff2d55]">
                            {formatCurrency(entry.spent)}
                          </p>
                          {entry.received > 0 ? (
                            <p className="mt-1 font-semibold text-[#30d158]">
                              +{formatCurrency(entry.received)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {activeTab === "analysis" ? (
          <section className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Analysis Filter</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Analyse all saved rows, or focus on one month.
                  </p>
                </div>
                <form className="grid w-full gap-3 lg:w-auto lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
                  <input name="tab" type="hidden" value="analysis" />
                  <div>
                    <Label htmlFor="analysisMonth">Analysis range</Label>
                    <div className="relative mt-2">
                      <select
                        className="h-14 w-full appearance-none rounded-3xl border border-white/10 bg-white/6 px-5 pr-12 text-base text-white outline-none transition focus:border-[#30d158] focus:ring-4 focus:ring-[#30d158]/15 disabled:opacity-50"
                        defaultValue={dashboard.selectedAnalysisMonth}
                        disabled={dashboard.months.length === 0}
                        id="analysisMonth"
                        name="analysisMonth"
                      >
                        <option className="bg-[#1c1c1e]" value="all">
                          All
                        </option>
                        {dashboard.months.map((month) => (
                          <option
                            className="bg-[#1c1c1e]"
                            key={month.monthKey}
                            value={month.monthKey}
                          >
                            {month.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={20}
                      />
                    </div>
                  </div>
                  <Button className="h-14 w-full px-7 lg:w-auto" type="submit" variant="ghost">
                    View
                  </Button>
                </form>
              </CardHeader>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                accent="#ff2d55"
                icon={<ArrowUpCircle size={24} />}
                label="Avg monthly spent"
                value={formatCurrency(dashboard.analysis.averageMonthlySpent)}
              />
              <StatCard
                accent="#30d158"
                icon={<ArrowDownCircle size={24} />}
                label="Avg monthly received"
                value={formatCurrency(dashboard.analysis.averageMonthlyReceived)}
              />
              <StatCard
                accent="#0a84ff"
                icon={<Wallet size={24} />}
                label="Avg monthly net"
                value={formatCurrency(dashboard.analysis.averageMonthlyNet)}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Car Fuel Efficiency</CardTitle>
                <p className="text-sm text-zinc-400">
                  Uses descriptions like Fuel 19287km 43.02L for{" "}
                  {dashboard.selectedAnalysisLabel}. Average is calculated from
                  odometer distance between fuel entries.
                </p>
              </CardHeader>
              <CardContent>
                {dashboard.analysis.fuel.sampleCount === 0 ? (
                  <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                    Add at least two fuel rows like Fuel 19287km 43.02L to
                    calculate car average.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Average</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatNumber(
                          dashboard.analysis.fuel.averageLitresPer100Km ?? 0,
                          2,
                        )}{" "}
                        L/100km
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Mileage</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatNumber(
                          dashboard.analysis.fuel.averageKmPerLitre ?? 0,
                          2,
                        )}{" "}
                        km/L
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Distance</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatNumber(dashboard.analysis.fuel.totalDistanceKm)} km
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Fuel used</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatNumber(dashboard.analysis.fuel.totalLitres, 2)} L
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Cash Flow</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Spent versus received for {dashboard.selectedAnalysisLabel}.
                  </p>
                </CardHeader>
                <CardContent>
                  <MonthlyExpenseChart data={analysisMonthlyChart} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Net Trend</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Received minus spent for the selected analysis range.
                  </p>
                </CardHeader>
                <CardContent>
                  <NetTotalChart data={analysisMonthlyChart} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Spending Breakdown</CardTitle>
                <p className="text-sm text-zinc-400">
                  Highest grouped spending items for{" "}
                  {dashboard.selectedAnalysisLabel}.
                </p>
              </CardHeader>
              <CardContent>
                <SpendingBreakdownChart data={topExpenseChart} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wise / NRE Transfer Summary</CardTitle>
                <p className="text-sm text-zinc-400">
                  Groups Transfer to Wise and Transfer to NRE together. INR is
                  read from descriptions like Transfer to NRE 25,000 Rupees.
                </p>
              </CardHeader>
              <CardContent>
                {dashboard.analysis.remittance.count === 0 ? (
                  <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                    No Wise/NRE transfers found in this range.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Transactions</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {dashboard.analysis.remittance.count}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">AUD sent</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatCurrency(dashboard.analysis.remittance.totalAud)}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">INR noted</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatInr(dashboard.analysis.remittance.totalInr)}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/4 p-4">
                      <p className="text-sm text-zinc-400">Avg rate</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {dashboard.analysis.remittance.averageRate
                          ? formatNumber(
                              dashboard.analysis.remittance.averageRate,
                              2,
                            )
                          : "N/A"}{" "}
                        INR/AUD
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Spending Groups</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Same descriptions are grouped and ranked by total spent.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.analysis.topExpenses.length === 0 ? (
                      <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                        No spending yet.
                      </p>
                    ) : (
                      dashboard.analysis.topExpenses.map((item) => (
                        <div
                          className="flex items-center justify-between gap-4 rounded-3xl bg-white/4 p-4"
                          key={item.label}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {item.count} transaction
                              {item.count === 1 ? "" : "s"}
                            </p>
                          </div>
                          <p className="font-semibold text-[#ff2d55]">
                            {formatCurrency(item.spent)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frequent Entries</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Items that appear more than once, like coffee or fees.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.analysis.frequentEntries.length === 0 ? (
                      <p className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                        No repeated entries yet.
                      </p>
                    ) : (
                      dashboard.analysis.frequentEntries.map((item) => (
                        <div
                          className="flex items-center justify-between gap-4 rounded-3xl bg-white/4 p-4"
                          key={item.label}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {item.count} x {item.label}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              Total spent {formatCurrency(item.spent)}
                            </p>
                          </div>
                          <p className="font-semibold text-[#30d158]">
                            {item.count}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
