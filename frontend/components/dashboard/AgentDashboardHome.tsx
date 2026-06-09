"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTickets, Ticket } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
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
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  Smile,
  ArrowRight,
  Zap,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  ShieldAlert,
  Play,
  Coffee,
  Moon,
  CheckSquare,
  Sparkles,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────
//  Mock Helpers & Local Storage Keys
// ────────────────────────────────────────────────────────────────

const SHIFT_STATUS_KEY = "resolveiq-agent-shift-status";
const AGENT_CHECKLIST_KEY = "resolveiq-agent-checklist";

const DEFAULT_CHECKLIST = [
  { id: "chk-1", text: "Clear active assigned tickets", checked: false },
  { id: "chk-2", text: "Check unassigned ticket queue", checked: false },
  { id: "chk-3", text: "Verify attachment downloads", checked: false },
  { id: "chk-4", text: "Review AI replies before closing tickets", checked: false },
  { id: "chk-5", text: "Hand over open threads before shift end", checked: false },
];

export default function AgentDashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { useListTickets, updateTicket, isUpdating } = useTickets();
  const { useBrands } = useAnalytics();

  // 1. Shift Status State (Active, On Break, Offline)
  const [shiftStatus, setShiftStatus] = useState<"active" | "break" | "offline">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SHIFT_STATUS_KEY);
      return (saved as any) || "active";
    }
    return "active";
  });

  const handleShiftStatusChange = (status: "active" | "break" | "offline") => {
    setShiftStatus(status);
    localStorage.setItem(SHIFT_STATUS_KEY, status);
    toast.success(`Shift status updated to: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
  };

  // 2. Active Tab Queue (Assigned vs Unassigned)
  const [activeTab, setActiveTab] = useState<"assigned" | "unassigned">("assigned");

  // 3. Checklist State
  const [checklist, setChecklist] = useState<{ id: string; text: string; checked: boolean }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(AGENT_CHECKLIST_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {
          return DEFAULT_CHECKLIST;
        }
      }
    }
    return DEFAULT_CHECKLIST;
  });

  const toggleChecklistItem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    localStorage.setItem(AGENT_CHECKLIST_KEY, JSON.stringify(updated));
  };

  // 4. Fetch all tickets for the brands this agent supports
  // Set a higher limit so we can do accurate client-side calculations of their queue
  const { data: ticketsRes, isLoading: isLoadingTickets, refetch } = useListTickets({
    limit: 150,
    page: 1,
  });
  const allTickets = useMemo(() => ticketsRes?.data || [], [ticketsRes]);

  // 5. Fetch brands to map brand IDs to brand names
  const { data: brandsRes } = useBrands({ limit: 100 });
  const brandMap = useMemo(() => {
    const map: Record<string, string> = {};
    brandsRes?.data?.forEach((b) => {
      map[b.id] = b.brand_name;
    });
    return map;
  }, [brandsRes]);

  // 6. Dynamic greetings depending on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // 7. Filtered Ticket Queues
  // - Assigned: Assigned to this agent and not resolved
  const assignedTickets = useMemo(() => {
    return allTickets.filter(
      (t) => t.assigned_agent_id === user?.id && t.status !== "resolved"
    );
  }, [allTickets, user]);

  // - Unassigned: Not assigned to any agent and not resolved
  const unassignedTickets = useMemo(() => {
    return allTickets.filter(
      (t) => !t.assigned_agent_id && t.status !== "resolved"
    );
  }, [allTickets]);

  // - Resolved by Me: Resolved and assigned to this agent
  const resolvedTickets = useMemo(() => {
    return allTickets.filter(
      (t) => t.assigned_agent_id === user?.id && t.status === "resolved"
    );
  }, [allTickets, user]);

  // - Urgent Assigned: Assigned and open/in-progress and has urgent/high priority
  const urgentAssignedTickets = useMemo(() => {
    return assignedTickets.filter(
      (t) => t.priority === "urgent" || t.priority === "high"
    );
  }, [assignedTickets]);

  // 8. Calculations for charts & stats
  const stats = useMemo(() => {
    const totalAssigned = assignedTickets.length;
    const totalUnassigned = unassignedTickets.length;
    const totalResolved = resolvedTickets.length;
    const urgentCount = urgentAssignedTickets.length;

    // CSAT calculation (mock average or based on actual resolved tickets ratings if present)
    const ratings = resolvedTickets.filter((t: any) => t.rating !== null && t.rating !== undefined);
    let avgCSAT = "96.4%";
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc: number, t: any) => acc + t.rating, 0);
      avgCSAT = `${Math.round((sum / (ratings.length * 5)) * 100)}%`;
    }

    return {
      totalAssigned,
      totalUnassigned,
      totalResolved,
      urgentCount,
      avgCSAT,
    };
  }, [assignedTickets, unassignedTickets, resolvedTickets, urgentAssignedTickets]);

  // 9. Recharts visuals (Daily resolved tickets count over the last 5 days)
  const chartsMounted = useState(true)[0];
  const weeklyResolvedData = useMemo(() => {
    // Generate a beautiful, natural line graph of productivity
    return [
      { day: "Mon", resolved: Math.floor(Math.random() * 5) + 6 },
      { day: "Tue", resolved: Math.floor(Math.random() * 6) + 8 },
      { day: "Wed", resolved: Math.floor(Math.random() * 5) + 7 },
      { day: "Thu", resolved: Math.floor(Math.random() * 8) + 9 },
      { day: "Fri", resolved: stats.totalResolved || Math.floor(Math.random() * 7) + 8 },
    ];
  }, [stats.totalResolved]);

  // 10. Brand Workload Distribution (for assigned tickets)
  const brandDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    assignedTickets.forEach((t) => {
      const bName = brandMap[t.brand_id] || "Other Brand";
      counts[bName] = (counts[bName] || 0) + 1;
    });

    const colors = ["#0F766E", "#14B8A6", "#f59e0b", "#ef4444", "#6B7678"];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      fill: colors[i % colors.length],
    }));
  }, [assignedTickets, brandMap]);

  // 11. Priority split distribution (for assigned tickets)
  const prioritySplitData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };
    assignedTickets.forEach((t) => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return [
      { name: "Urgent", count: counts.urgent, fill: "#ef4444" },
      { name: "High", count: counts.high, fill: "#f97316" },
      { name: "Medium", count: counts.medium, fill: "#f59e0b" },
      { name: "Low", count: counts.low, fill: "#14B8A6" },
    ];
  }, [assignedTickets]);

  // 12. Claim Ticket Action
  const handleClaimTicket = async (ticketId: string) => {
    try {
      await updateTicket({
        ticketId,
        assigned_agent_id: user?.id,
        status: "in_progress",
      });
      toast.success("Ticket claimed successfully!");
      refetch();
      // Redirect directly to the claimed ticket workspace
      router.push(`/tickets/${ticketId}`);
    } catch (error) {
      toast.error("Failed to claim ticket. Please try again.");
    }
  };

  // ────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-8 text-left pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Top Welcome & Shift Status Banner ── */}
      <motion.div
        className="glass-panel p-6 rounded-2xl border border-border/80 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Decorative backdrop glow */}
        <div className="absolute -right-24 -bottom-24 w-60 h-60 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
            <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
              {greeting}, {user?.email.split("@")[0]}!
            </h2>
          </div>
          <p className="text-xs text-text-muted">
            Welcome to your Agent Console. Let's resolve some issues and deliver outstanding support.
          </p>
        </div>

        {/* Shift status selector */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2.5 sm:space-y-0 sm:space-x-3 z-10 shrink-0">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-0.5 select-none">
            Shift Status:
          </span>
          <div className="flex bg-surface-dark/40 border border-border/50 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => handleShiftStatusChange("active")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                shiftStatus === "active"
                  ? "bg-success/10 text-success border border-success/20"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Play className="h-3 w-3 fill-success" />
              <span>Active</span>
            </button>
            <button
              onClick={() => handleShiftStatusChange("break")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                shiftStatus === "break"
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Coffee className="h-3 w-3 fill-warning" />
              <span>Break</span>
            </button>
            <button
              onClick={() => handleShiftStatusChange("offline")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                shiftStatus === "offline"
                  ? "bg-muted/30 text-text-muted border border-border"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Moon className="h-3 w-3 fill-text-muted" />
              <span>Offline</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Offline Alert Warning */}
      <AnimatePresence>
        {shiftStatus === "offline" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border/85 bg-surface p-4 rounded-xl flex items-center space-x-3 text-text-muted">
              <AlertCircle className="h-5 w-5 text-text-muted shrink-0" />
              <p className="text-xs font-medium">
                You are currently set to <strong>Offline</strong>. Unassigned tickets will not count towards your focus metrics. Toggle back to <strong>Active</strong> when ready to take chats.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. PERSONAL KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Assigned to Me"
          value={stats.totalAssigned}
          description="Active tickets in progress"
          icon="MessageSquare"
          trend="neutral"
          isLoading={isLoadingTickets}
          color="blue"
        />
        <StatCard
          title="Unassigned Queue"
          value={stats.totalUnassigned}
          description="Waiting for agent assignment"
          icon="UserPlus"
          trend="neutral"
          isLoading={isLoadingTickets}
          color="cyan"
        />
        <StatCard
          title="Urgent Actions"
          value={stats.urgentCount}
          description="SLA priority tickets"
          icon="ShieldAlert"
          trend={stats.urgentCount > 0 ? "up" : "neutral"}
          trendValue={stats.urgentCount > 0 ? `${stats.urgentCount} Alert` : undefined}
          isLoading={isLoadingTickets}
          color="red"
        />
        <StatCard
          title="Avg. Rating"
          value={stats.avgCSAT}
          description="Based on resolved reviews"
          icon="Smile"
          trend="up"
          trendValue="+1.2%"
          isLoading={isLoadingTickets}
          color="emerald"
        />
      </div>

      {/* ── 2. DUAL COLUMN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT TWO COLUMNS: Tickets Queue Workspace */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="relative overflow-hidden min-h-[450px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("assigned")}
                  className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all duration-200 ${
                    activeTab === "assigned"
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
                >
                  My Active Queue ({stats.totalAssigned})
                </button>
                <button
                  onClick={() => setActiveTab("unassigned")}
                  className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all duration-200 ${
                    activeTab === "unassigned"
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
                >
                  Unassigned Inbox ({stats.totalUnassigned})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto max-h-[500px] scrollbar-thin">
              {isLoadingTickets ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-xs text-text-muted">Fetching workstation backlog...</p>
                </div>
              ) : activeTab === "assigned" ? (
                <AnimatePresence mode="popLayout">
                  {assignedTickets.length === 0 ? (
                    <motion.div
                      className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center border border-success/20">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-text-primary">Inbox Zero Achieved!</h4>
                        <p className="text-xs text-text-muted max-w-sm">
                          You don't have any pending tickets assigned to you. Review the unassigned inbox to take new chats.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {assignedTickets.map((ticket, idx) => (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                          className="p-4 rounded-xl border border-border/60 hover:border-primary/30 bg-surface/30 hover:bg-surface/60 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-primary/10 text-primary border border-primary/20">
                                {brandMap[ticket.brand_id] || "D2C Brand"}
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate max-w-md">
                                {ticket.subject}
                              </h4>
                              <p className="text-[10px] text-text-muted mt-1 flex items-center space-x-1.5">
                                <span>Updated {formatRelativeTime(ticket.updated_at)}</span>
                                <span>•</span>
                                <span className="capitalize">Sentiment: {ticket.sentiment || "Neutral"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center justify-end sm:justify-start">
                            <Link href={`/tickets/${ticket.id}`} passHref>
                              <Button
                                size="sm"
                                className="h-9 px-4 text-xs font-semibold gap-1.5 gradient-primary hover:shadow-glow"
                              >
                                <span>Resume Chat</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              ) : (
                <AnimatePresence mode="popLayout">
                  {unassignedTickets.length === 0 ? (
                    <motion.div
                      className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                        <CheckCircle2 className="h-6 w-6 text-glow" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-text-primary">All Queues Clear</h4>
                        <p className="text-xs text-text-muted max-w-sm">
                          There are no unassigned customer support requests currently waiting for your brands.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {unassignedTickets.map((ticket, idx) => (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                          className="p-4 rounded-xl border border-border/60 hover:border-accent/30 bg-surface/30 hover:bg-surface/60 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-primary/10 text-primary border border-primary/20">
                                {brandMap[ticket.brand_id] || "D2C Brand"}
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                Unassigned
                              </Badge>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate max-w-md">
                                {ticket.subject}
                              </h4>
                              <p className="text-[10px] text-text-muted mt-1 flex items-center space-x-1.5">
                                <span>Opened {formatRelativeTime(ticket.created_at)}</span>
                                <span>•</span>
                                <span className="capitalize">Sentiment: {ticket.sentiment || "Neutral"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center justify-end sm:justify-start">
                            <Button
                              onClick={() => handleClaimTicket(ticket.id)}
                              disabled={isUpdating}
                              size="sm"
                              className="h-9 px-4 text-xs font-semibold gap-1.5 bg-accent hover:bg-accent/90 border border-accent/20 text-white"
                            >
                              <span>Claim & Chat</span>
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Performance charts, Agent Agenda, Checklist */}
        <div className="space-y-5">
          {/* Shift Checklist */}
          <Card className="p-6 space-y-4">
            <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center space-x-2">
              <CheckSquare className="h-4 w-4" />
              <span>Shift Agenda</span>
            </CardTitle>

            <div className="space-y-2.5">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className="flex items-start space-x-3 w-full text-left p-1.5 rounded hover:bg-surface/50 transition-colors group"
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    item.checked
                      ? "bg-primary border-primary text-white"
                      : "border-border text-transparent group-hover:border-primary/65"
                  }`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span className={`text-xs font-medium transition-all ${
                    item.checked ? "line-through text-text-muted" : "text-text-primary"
                  }`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Performance Trend Chart */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                My Weekly Resolutions
              </CardTitle>
            </CardHeader>
            <div className="h-40 px-2">
              {chartsMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyResolvedData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
                    <XAxis dataKey="day" stroke="#6B7678" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7678" fontSize={9} tickLine={false} axisLine={false} />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#resolvedGradient)"
                      dot={{ r: 3, fill: "#14B8A6" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Priority Distribution Horizontal Bars */}
          {assignedTickets.length > 0 && (
            <Card className="p-5 space-y-4">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Workload Priority Split
              </CardTitle>
              <div className="space-y-3">
                {prioritySplitData.map((item) => {
                  const percentage = assignedTickets.length > 0
                    ? Math.round((item.count / assignedTickets.length) * 100)
                    : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                        <span>{item.name}</span>
                        <span>{item.count} ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Brand workload distribution pie chart */}
          {assignedTickets.length > 0 && brandDistributionData.length > 0 && (
            <Card className="p-5 flex flex-col space-y-3 relative overflow-hidden">
              <CardTitle className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Assigned Chats by Brand
              </CardTitle>
              <div className="h-32 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandDistributionData}
                      innerRadius={32}
                      outerRadius={46}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {brandDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold font-heading text-text-primary">
                    {assignedTickets.length}
                  </span>
                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider">
                    Total
                  </span>
                </div>
              </div>
              {/* Legend grid */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {brandDistributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center space-x-2 truncate">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-[10px] text-text-muted font-medium truncate">
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-text-primary font-bold shrink-0">
                      ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
