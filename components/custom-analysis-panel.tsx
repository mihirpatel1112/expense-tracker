"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { MonthlySpentOnlyChart } from "@/components/expense-charts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomAnalysisOption } from "@/lib/expenses";

type ChartPoint = {
  label: string;
  spent: number;
  received: number;
  net: number;
};

function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) {
    return 1;
  }
  if (t.includes(q)) {
    return 200 - Math.min(t.length, 160);
  }
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) {
      qi += 1;
    }
  }
  if (qi === q.length) {
    return 100 - Math.min(t.length, 160);
  }
  return 0;
}

function groupHref(key: string) {
  const q = new URLSearchParams();
  q.set("tab", "custom");
  q.set("customGroup", key);
  return `/?${q.toString()}`;
}

export function CustomAnalysisPanel({
  options,
  selectedGroupKey,
  selectedGroupLabel,
  monthlySpendSeries,
}: {
  options: CustomAnalysisOption[];
  selectedGroupKey: string | null;
  selectedGroupLabel: string | null;
  monthlySpendSeries: ChartPoint[];
}) {
  const [query, setQuery] = useState("");

  const ranked = useMemo(() => {
    const haystack = (o: CustomAnalysisOption) =>
      `${o.label} ${o.key}`.toLowerCase();
    if (!query.trim()) {
      return [...options];
    }
    return [...options]
      .map((o) => ({
        option: o,
        score: fuzzyScore(query, haystack(o)),
      }))
      .filter((x) => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.option.totalSpent - a.option.totalSpent ||
          a.option.label.localeCompare(b.option.label),
      )
      .map((x) => x.option);
  }, [options, query]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div>
            <Label className="flex items-center gap-2" htmlFor="customSearch">
              <Search className="text-zinc-500" size={16} />
              Fuzzy search groups
            </Label>
            <Input
              autoComplete="off"
              className="mt-2 h-12 rounded-2xl border-white/10 bg-white/6 text-white placeholder:text-zinc-500"
              id="customSearch"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. haircut, fuel, wise…"
              value={query}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Fuel rows with different km/L still map to one group, same as
              Analysis breakdown.
            </p>
          </div>
          <div className="max-h-[min(24rem,55vh)] space-y-1 overflow-y-auto rounded-3xl border border-white/10 bg-white/3 p-2">
            {options.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500">
                No spending rows yet.
              </p>
            ) : ranked.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500">
                No matches — try a shorter fragment.
              </p>
            ) : (
              ranked.map((o) => {
                const active = selectedGroupKey === o.key;
                return (
                  <Link
                    className={
                      active
                        ? "flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-black"
                        : "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    }
                    href={groupHref(o.key)}
                    key={o.key}
                  >
                    <span className="min-w-0 truncate font-medium">{o.label}</span>
                    <span
                      className={
                        active ? "shrink-0 text-xs text-zinc-600" : "shrink-0 text-xs text-zinc-500"
                      }
                    >
                      {o.count}×
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-h-72 flex-col rounded-3xl border border-white/10 bg-white/2 p-4 sm:p-5">
          {!selectedGroupKey ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
              <p>Select a group from the list to see monthly spent.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Monthly spent
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                  {selectedGroupLabel ?? selectedGroupKey}
                </p>
              </div>
              <div className="flex-1">
                <MonthlySpentOnlyChart data={monthlySpendSeries} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
