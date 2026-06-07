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

// Colors corresponding to our design system
const STATUS_COLORS = {
  open: "#a855f7",
  in_progress: "#3b82f6",
  resolved: "#10b981",
};

const SENTIMENT_COLORS = {
  positive: "#10b981",
  neutral: "#64748b",
  negative: "#ef4444",
};

const ACCENT_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

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
              contentStyle={{ background: "#111118", borderColor: "#1e1e2e", borderRadius: "8px" }}
              itemStyle={{ color: "#f8fafc" }}
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
    fill: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS] || "#3b82f6",
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
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{ background: "#111118", borderColor: "#1e1e2e", borderRadius: "8px" }}
              itemStyle={{ color: "#f8fafc" }}
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
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{ background: "#111118", borderColor: "#1e1e2e", borderRadius: "8px" }}
              itemStyle={{ color: "#f8fafc" }}
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
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#111118", borderColor: "#1e1e2e", borderRadius: "8px" }}
              itemStyle={{ color: "#f8fafc" }}
            />
            <Area type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
