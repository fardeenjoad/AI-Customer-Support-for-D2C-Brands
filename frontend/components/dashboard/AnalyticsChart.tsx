"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

// Colors corresponding to our design system (monochromatic primary shades)
const STATUS_COLORS = {
  open: "#99d9d4",
  in_progress: "#4db5ad",
  resolved: "#0F766E",
};

const SENTIMENT_COLORS = {
  positive: "#0F766E",
  neutral: "#94a3b8",
  negative: "#cbd5e1",
};

const ACCENT_COLORS = ["#0F766E", "#0d645e", "#14958c", "#4db5ad", "#99d9d4"];

interface ChartProps {
  data: Record<string, number>;
  title: string;
}

export function StatusPieChart({ data, title }: ChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 flex items-center justify-center text-text-muted">Loading chart...</div>;

  const chartData = Object.entries(data || {}).map(([key, val]) => ({
    name: key.replace("_", " ").toUpperCase(),
    value: val,
    color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] || "#64748b",
  }));

  return (
    <Card className="flex flex-col h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <div className="flex-1 min-h-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", color: "#0F172A" }}
              itemStyle={{ color: "#0F172A" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-[10px] text-text-muted">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function SentimentBarChart({ data, title }: ChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 flex items-center justify-center text-text-muted">Loading chart...</div>;

  const chartData = Object.entries(data || {}).map(([key, val]) => ({
    sentiment: key.toUpperCase(),
    count: val,
    fill: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS] || "#0F766E",
  }));

  return (
    <Card className="flex flex-col h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <div className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="sentiment" stroke="#64748b" fontSize={9} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(15, 118, 110, 0.04)" }}
              contentStyle={{ background: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", color: "#0F172A" }}
              itemStyle={{ color: "#0F172A" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function IntentsBarChart({ data, title }: ChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 flex items-center justify-center text-text-muted">Loading chart...</div>;

  const chartData = Object.entries(data || {}).map(([key, val], index) => ({
    intent: key.toUpperCase(),
    count: val,
    color: ACCENT_COLORS[index % ACCENT_COLORS.length],
  }));

  return (
    <Card className="flex flex-col h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <div className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} />
            <YAxis dataKey="intent" type="category" stroke="#64748b" fontSize={9} tickLine={false} width={80} />
            <Tooltip
              cursor={{ fill: "rgba(15, 118, 110, 0.04)" }}
              contentStyle={{ background: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", color: "#0F172A" }}
              itemStyle={{ color: "#0F172A" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function VolumeAreaChart({ data, title }: { data: any[]; title: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-80 flex items-center justify-center text-text-muted">Loading chart...</div>;

  return (
    <Card className="flex flex-col h-80 w-full col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <div className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", color: "#0F172A" }}
              itemStyle={{ color: "#0F172A" }}
            />
            <Area type="monotone" dataKey="tickets" stroke="#0F766E" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
