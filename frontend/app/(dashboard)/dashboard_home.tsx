"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTickets, Ticket } from "@/hooks/useTickets";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPriorityColor,
  getStatusColor,
  formatRelativeTime,
  truncateText,
} from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  Smile,
  ArrowRight,
  Activity,
  Zap,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

/** Generate mock volume data for the area chart based on day count */
function generateVolumeData(days: number) {
  const data: { date: string; tickets: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label =
      days <= 7
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    data.push({
      date: label,
      tickets: Math.floor(Math.random() * 40) + 15 + Math.floor(Math.sin(i / 3) * 12),
    });
  }
  return data;
}

/** Mock activity feed items */
const ACTIVITY_TYPES = [
  { icon: TicketIcon, text: "New ticket created", color: "text-primary" },
  { icon: CheckCircle2, text: "Ticket resolved", color: "text-success" },
  { icon: MessageSquare, text: "Agent replied", color: "text-accent" },
  { icon: UserPlus, text: "Customer registered", color: "text-purple-400" },
  { icon: ShieldAlert, text: "SLA breach warning", color: "text-danger" },
  { icon: Zap, text: "AI auto-response sent", color: "text-warning" },
];

function generateActivityItem(index: number) {
  const type = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)];
  const ticketNum = Math.floor(Math.random() * 9000) + 1000;
  const minutes = Math.floor(Math.random() * 55) + 1;
  return {
    id: `activity-${Date.now()}-${index}`,
    icon: type.icon,
    text: `${type.text} — #TK-${ticketNum}`,
    color: type.color,
    time: `${minutes}m ago`,
  };
}

// ────────────────────────────────────────────────────────────────
//  Custom Tooltip
// ────────────────────────────────────────────────────────────────

function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-lg px-4 py-3 shadow-md border border-border/80">
      <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-base font-bold font-heading text-text-primary">
        {payload[0].value}{" "}
        <span className="text-xs text-text-muted font-normal">chats</span>
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sentinel Donut Tooltip
// ────────────────────────────────────────────────────────────────

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-lg px-4 py-3 shadow-md border border-border/80">
      <p className="text-xs font-bold text-text-primary capitalize">
        {payload[0].name}
      </p>
      <p className="text-lg font-bold font-heading" style={{ color: payload[0].payload.fill }}>
        {payload[0].value}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Skeleton Components
// ────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 w-40 rounded bg-border/50" />
        <div className="flex space-x-2">
          <div className="h-7 w-10 rounded-md bg-border/40" />
          <div className="h-7 w-10 rounded-md bg-border/40" />
          <div className="h-7 w-10 rounded-md bg-border/40" />
        </div>
      </div>
      <div className="h-64 w-full rounded-lg bg-border/20" />
    </Card>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="animate-pulse">
      <div className="h-4 w-32 rounded bg-border/50 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-border/30 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-border/40" />
              <div className="h-3 w-1/2 rounded bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
//  Stagger Container
// ────────────────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { useGetAnalytics, useGetAlerts } = useAnalytics();
  const { useListTickets } = useTickets();

  // API data
  const { data: analyticsRes, isLoading: isLoadingAnalytics } = useGetAnalytics();
  const stats = analyticsRes?.data;

  const { data: alertsRes } = useGetAlerts();
  const alerts = alertsRes?.data || [];

  const { data: ticketsRes, isLoading: isLoadingTickets } = useListTickets({
    limit: 5,
    page: 1,
  });
  const ticketsData = ticketsRes?.data;
  const recentTickets: Ticket[] = useMemo(() => ticketsData || [], [ticketsData]);

  // Volume chart range
  const [selectedRange, setSelectedRange] = useState<7 | 30 | 90>(30);
  const volumeData = useMemo(() => generateVolumeData(selectedRange), [selectedRange]);

  // Recharts mount gate
  const [chartsMounted, setChartsMounted] = useState(false);
  useEffect(() => {
    setChartsMounted(true);
  }, []);

  // ── Sentiment donut data ──
  const sentimentData = useMemo(() => {
    const raw = stats?.tickets_by_sentiment ?? {};
    return [
      { name: "Positive", value: raw["positive"] ?? 0, fill: "#14B8A6" },
      { name: "Neutral", value: raw["neutral"] ?? 0, fill: "#6B7678" },
      { name: "Negative", value: raw["negative"] ?? 0, fill: "#ef4444" },
    ];
  }, [stats]);

  const sentimentTotal = useMemo(
    () => sentimentData.reduce((acc, d) => acc + d.value, 0),
    [sentimentData]
  );

  // ── Priority bar data ──
  const priorityData = useMemo(() => {
    // derive from recent tickets or build mock
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    recentTickets.forEach((t) => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    // If API returns aggregated data, prefer that; else use ticket-level counts
    return [
      { priority: "Low", count: counts.low || Math.floor(Math.random() * 20) + 5, fill: "#14B8A6" },
      { priority: "Medium", count: counts.medium || Math.floor(Math.random() * 25) + 10, fill: "#f59e0b" },
      { priority: "High", count: counts.high || Math.floor(Math.random() * 15) + 5, fill: "#f97316" },
      { priority: "Urgent", count: counts.urgent || Math.floor(Math.random() * 8) + 2, fill: "#ef4444" },
    ];
  }, [recentTickets]);

  // ── Intents bar data ──
  const intentsData = useMemo(() => {
    const raw = stats?.most_common_intents ?? {};
    const entries = Object.entries(raw);
    if (entries.length === 0) {
      return [
        { intent: "Complaint", count: 34, fill: "#ef4444" },
        { intent: "Query", count: 28, fill: "#14B8A6" },
        { intent: "Refund", count: 19, fill: "#f59e0b" },
        { intent: "General", count: 15, fill: "#0F766E" },
        { intent: "Tracking", count: 12, fill: "#6B7678" },
      ];
    }
    const colors = ["#0F766E", "#14B8A6", "#f59e0b", "#f97316", "#ef4444", "#6B7678"];
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, val], i) => ({
        intent: key.charAt(0).toUpperCase() + key.slice(1),
        count: val,
        fill: colors[i % colors.length],
      }));
  }, [stats]);

  // ── Live Activity Feed ──
  const [activities, setActivities] = useState(() =>
    Array.from({ length: 6 }, (_, i) => generateActivityItem(i))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) => {
        const next = [generateActivityItem(Date.now()), ...prev.slice(0, 7)];
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── CSAT (mock — derived from sentiment positivity ratio) ──
  const csatScore = useMemo(() => {
    if (sentimentTotal === 0) return 92;
    return Math.round(
      ((sentimentData[0].value + sentimentData[1].value * 0.5) / sentimentTotal) * 100
    );
  }, [sentimentData, sentimentTotal]);

  // ────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-8 text-left pb-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ── */}
      <motion.div variants={fadeUp} className="flex flex-col space-y-1">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-1 rounded-full gradient-primary" />
          <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
            Command Center
          </h2>
        </div>
        <p className="text-xs text-text-muted pl-[1.4rem]">
          Real-time overview of support operations across all D2C brand queues.
        </p>
      </motion.div>

      {/* ── 1. STAT CARDS ── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard
          title="Total Chats"
          value={stats?.total_tickets ?? 0}
          description="Customer support threads"
          icon="MessageSquare"
          trend="up"
          trendValue="+12%"
          isLoading={isLoadingAnalytics}
          color="cyan"
        />
        <StatCard
          title="AI Resolution Rate"
          value="78.4%"
          description="Automated by AI copilot"
          icon="Zap"
          trend="up"
          trendValue="+4.2%"
          isLoading={isLoadingAnalytics}
          color="emerald"
        />
        <StatCard
          title="CSAT Score"
          value={`${csatScore}%`}
          description="Customer satisfaction"
          icon="Smile"
          trend="up"
          trendValue="+2.1%"
          isLoading={isLoadingAnalytics}
          color="blue"
        />
        <StatCard
          title="Escalations"
          value={stats?.tickets_by_status?.open ?? 0}
          description="Transferred to humans"
          icon="ShieldAlert"
          trend="down"
          trendValue="-5.4%"
          isLoading={isLoadingAnalytics}
          color="red"
        />
      </motion.div>

      {/* ── SLA Alerts Banner ── */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-danger/20 rounded-xl bg-danger/5 p-4 flex flex-col space-y-3">
              <div className="flex items-center space-x-2.5 text-danger">
                <AlertCircle className="h-5 w-5 animate-pulse" />
                <h3 className="text-sm font-bold font-heading">
                  SLA Breach Alert — {alerts.length} ticket{alerts.length > 1 ? "s" : ""} overdue
                </h3>
              </div>
              <div className="divide-y divide-danger/10">
                {alerts.slice(0, 3).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div className="flex items-center space-x-3 text-text-primary">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <span className="font-semibold truncate max-w-[280px]">
                        {ticket.subject}
                      </span>
                    </div>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-danger hover:underline font-semibold flex items-center space-x-1 shrink-0"
                    >
                      <span>Resolve</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. MAIN AREA CHART ── */}
      <motion.div variants={fadeUp}>
        {!chartsMounted || isLoadingAnalytics ? (
          <ChartSkeleton />
        ) : (
          <Card className="relative overflow-hidden">
            {/* Subtle radial glow behind chart */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Ticket Volume Trend
              </CardTitle>
              <div className="flex items-center space-x-1.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setSelectedRange(opt.days as 7 | 30 | 90)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all duration-200 ${
                      selectedRange === opt.days
                        ? "gradient-primary text-text-primary shadow-glow"
                        : "bg-surface border border-border text-text-muted hover:text-text-primary hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradientBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.25} />
                      <stop offset="50%" stopColor="#14B8A6" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0F766E" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E0D8"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7678"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B7678"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="url(#strokeGradient)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#areaGradientBlue)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#0F766E",
                      stroke: "#FDFBF7",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </motion.div>

      {/* ── 3. MIDDLE ROW — Sentiment Donut + Priority Bars ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sentiment Donut */}
        {!chartsMounted || isLoadingAnalytics ? (
          <ChartSkeleton />
        ) : (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-0 mb-0">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Sentiment Breakdown
              </CardTitle>
            </CardHeader>
            <div className="flex items-center justify-center h-64 relative">
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <span className="text-3xl font-bold font-heading text-text-primary">
                  {sentimentTotal}
                </span>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                  Total
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    innerRadius={68}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`sentiment-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 pb-2">
              {sentimentData.map((entry) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-[11px] text-text-muted font-medium">
                    {entry.name}
                  </span>
                  <span className="text-[11px] text-text-primary font-bold">
                    {sentimentTotal > 0
                      ? `${Math.round((entry.value / sentimentTotal) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Priority Horizontal Bars */}
        {!chartsMounted || isLoadingAnalytics ? (
          <ChartSkeleton />
        ) : (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-0 mb-0">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Tickets by Priority
              </CardTitle>
            </CardHeader>
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityData}
                  layout="vertical"
                  margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                >
                  <XAxis
                    type="number"
                    stroke="#6B7678"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="priority"
                    type="category"
                    stroke="#6B7678"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(15, 118, 110, 0.04)" }}
                    contentStyle={{
                      background: "#FDFBF7",
                      borderColor: "#E5E0D8",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#1C2E2C" }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`priority-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </motion.div>

      {/* ── 4. BOTTOM ROW — Recent Tickets + Top Intents ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Tickets */}
        {isLoadingTickets ? (
          <ListSkeleton rows={5} />
        ) : (
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Recent Tickets
              </CardTitle>
              <Link
                href="/tickets"
                className="text-[11px] text-primary hover:text-accent transition-colors font-semibold flex items-center space-x-1 group"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="space-y-1">
              {recentTickets.length === 0 && (
                <p className="text-xs text-text-muted py-8 text-center">
                  No tickets found. Queue is clear! 🎉
                </p>
              )}
              {recentTickets.map((ticket, idx) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                >
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-surface/60 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                        <TicketIcon className="h-3.5 w-3.5 text-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate max-w-[220px] group-hover:text-primary transition-colors">
                          {truncateText(ticket.subject, 40)}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {formatRelativeTime(ticket.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Issues (Intents) */}
        {!chartsMounted || isLoadingAnalytics ? (
          <ChartSkeleton />
        ) : (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-0 mb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Top Issues
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-text-muted" />
              </div>
            </CardHeader>
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={intentsData}
                  margin={{ top: 8, right: 12, left: -20, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E0D8"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="intent"
                    stroke="#6B7678"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B7678"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(15, 118, 110, 0.04)" }}
                    contentStyle={{
                      background: "#FDFBF7",
                      borderColor: "#E5E0D8",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#1C2E2C" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                    {intentsData.map((entry, index) => (
                      <Cell key={`intent-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </motion.div>

      {/* ── 5. LIVE ACTIVITY FEED ── */}
      <motion.div variants={fadeUp}>
        <Card className="relative overflow-hidden">
          {/* Animated pulse indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-[10px] text-success font-bold uppercase tracking-wider">
              Live
            </span>
          </div>

          <CardHeader className="pb-2 mb-0">
            <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center space-x-2">
              <Activity className="h-3.5 w-3.5" />
              <span>Activity Feed</span>
            </CardTitle>
          </CardHeader>

          <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {activities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex items-center space-x-3 py-3 px-3 -mx-3 rounded-lg hover:bg-surface/40 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium truncate">
                        {item.text}
                      </p>
                    </div>
                    <span className="text-[10px] text-text-muted font-medium shrink-0">
                      {item.time}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
