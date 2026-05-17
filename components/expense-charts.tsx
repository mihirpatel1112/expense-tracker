"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  spent: number;
  received: number;
  net?: number;
};

type BreakdownPoint = {
  label: string;
  value: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function EmptyChart() {
  return (
    <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-zinc-500">
      Upload a CSV to see your chart.
    </div>
  );
}

export function DailyExpenseChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="spentFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d55" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ff2d55" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="receivedFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#30d158" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#30d158" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickFormatter={formatCurrency}
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              color: "#fff",
            }}
            formatter={(value: unknown, name) => [
              formatCurrency(Number(value ?? 0)),
              name === "spent" ? "Spent" : "Received",
            ]}
          />
          <Area
            dataKey="spent"
            fill="url(#spentFill)"
            stroke="#ff2d55"
            strokeWidth={3}
            type="monotone"
          />
          <Area
            dataKey="received"
            fill="url(#receivedFill)"
            stroke="#30d158"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyExpenseChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickFormatter={formatCurrency}
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              color: "#fff",
            }}
            formatter={(value: unknown, name) => [
              formatCurrency(Number(value ?? 0)),
              name === "spent" ? "Spent" : "Received",
            ]}
          />
          <Bar dataKey="spent" fill="#ff2d55" radius={[12, 12, 0, 0]} />
          <Bar dataKey="received" fill="#30d158" radius={[12, 12, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetTotalChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0a84ff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#0a84ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickFormatter={formatCurrency}
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              color: "#fff",
            }}
            formatter={(value: unknown) => [
              formatCurrency(Number(value ?? 0)),
              "Net total",
            ]}
          />
          <Area
            dataKey="net"
            fill="url(#netFill)"
            stroke="#0a84ff"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingBreakdownChart({ data }: { data: BreakdownPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
          <XAxis
            axisLine={false}
            tickFormatter={formatCurrency}
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tick={{ fill: "#8e8e93", fontSize: 12 }}
            type="category"
            width={112}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              color: "#fff",
            }}
            formatter={(value: unknown) => [
              formatCurrency(Number(value ?? 0)),
              "Spent",
            ]}
          />
          <Bar dataKey="value" fill="#ff2d55" radius={[0, 12, 12, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
