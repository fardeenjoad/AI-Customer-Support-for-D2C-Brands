"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  TicketIcon,
} from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Ticket, useTickets } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketTable from "@/components/tickets/TicketTable";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { cn, formatRelativeTime, getPriorityColor, getStatusColor, truncateText } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

function metricLabel(value: number | string | null | undefined, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function QueueMetric({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: typeof TicketIcon;
  tone: "indigo" | "amber" | "emerald" | "red";
}) {
  const styles = {
    indigo: "bg-primary/10 text-primary border-primary/20",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.02em] text-text-muted">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-text-primary">
            {value}
          </p>
          <p className="mt-1 text-xs text-text-muted">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${styles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function AISummaryCard({ tickets }: { tickets: Ticket[] }) {
  const urgentTicket = tickets.find((ticket) => ticket.priority === "urgent");
  const negativeTicket = tickets.find((ticket) => ticket.sentiment === "negative");
  const featuredTicket = urgentTicket || negativeTicket || tickets[0];

  return (
    <Card className="border-primary/20 bg-primary/[0.03] p-6 flex flex-col h-full min-h-[280px]">
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold tracking-tight text-text-primary">AI queue readout</h3>
            <p className="text-xs text-text-muted">Draft focus for the next agent action.</p>
          </div>
        </div>
        <Badge className="border-primary/20 bg-white text-primary rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase">Copilot</Badge>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {featuredTicket ? (
          <div className="border-l-4 border-primary bg-white px-4 py-3.5 rounded-r-lg flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-text-primary text-left">
                {truncateText(featuredTicket.subject, 72)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-text-muted text-left">
                Prioritize this thread because it is{" "}
                <span className="font-semibold text-text-primary">
                  {featuredTicket.priority === "urgent" ? "escalated" : featuredTicket.priority}
                </span>{" "}
                with{" "}
                <span className="font-semibold text-text-primary text-capitalize">
                  {featuredTicket.sentiment}
                </span>{" "}
                sentiment. Review context before sending the suggested response.
              </p>
            </div>
            <div className="text-left mt-3">
              <Link
                href={`/tickets/${featuredTicket.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                Open thread
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="border-l-4 border-primary bg-white px-4 py-4 rounded-r-lg flex-1 flex flex-col justify-center text-center">
            <p className="text-sm font-semibold text-text-primary text-left">No active queue pressure</p>
            <p className="mt-1 text-xs text-text-muted text-left">
              New tickets will appear here with AI triage context.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function RecentEscalations({ tickets }: { tickets: Ticket[] }) {
  const escalations = tickets
    .filter((ticket) => ticket.priority === "urgent" || ticket.sentiment === "negative")
    .slice(0, 3);

  return (
    <Card className="p-6 flex flex-col h-full min-h-[280px]">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div className="text-left">
          <h3 className="text-sm font-semibold tracking-tight text-text-primary">Escalation watch</h3>
          <p className="text-xs text-text-muted">Urgent or negative-sentiment conversations.</p>
        </div>
        <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-3">
        {escalations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 px-3 py-6">
            <p className="text-center text-xs text-text-muted">
              No escalations in the current result set.
            </p>
          </div>
        ) : (
          escalations.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="block rounded-lg border border-border px-3.5 py-2.5 transition-colors hover:border-primary/30 hover:bg-slate-50 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight text-text-primary">
                  {ticket.subject}
                </p>
                <Badge className={cn("shrink-0 text-[9px] px-2 py-0.5 rounded-full select-none uppercase font-bold", getPriorityColor(ticket.priority))}>
                  {ticket.priority === "urgent" ? "escalated" : ticket.priority}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-muted">
                <span>#{ticket.id.slice(0, 8)}</span>
                <span>{formatRelativeTime(ticket.created_at)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

/* ── Loading skeletons for predictable layout geometry ── */
function QueueMetricSkeleton() {
  return (
    <Card className="p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-8 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-lg" />
      </div>
    </Card>
  );
}

function AISummaryCardSkeleton() {
  return (
    <Card className="border-primary/20 bg-primary/[0.03] p-6 min-h-[280px] animate-pulse flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-48 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
      </div>
      <div className="border-l-4 border-slate-200 bg-white px-4 py-4 rounded-r-lg flex-1 mt-4 space-y-3">
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-3 w-5/6 bg-slate-200 rounded" />
        <div className="h-4 w-20 bg-slate-200 rounded mt-2" />
      </div>
    </Card>
  );
}

function RecentEscalationsSkeleton() {
  return (
    <Card className="p-6 min-h-[280px] animate-pulse flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-40 bg-slate-200 rounded" />
        </div>
        <div className="h-5 w-5 bg-slate-200 rounded" />
      </div>
      <div className="space-y-3 flex-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-2/3 bg-slate-200 rounded" />
              <div className="h-4 w-12 bg-slate-200 rounded-full" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardHome() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [brand, setBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  const { useGetAnalytics } = useAnalytics();
  const { data: analyticsRes } = useGetAnalytics(brand);
  const stats = analyticsRes?.data;

  const { useListTickets, updateTicket, deleteTicket } = useTickets();
  const { data: ticketsRes, isLoading, refetch, isRefetching } = useListTickets({
    page,
    limit: 12,
    status_filter: status,
    priority_filter: priority,
    brand_filter: brand,
  });

  /* ── Minimum Display Timer for Skeletons to prevent flickers ── */
  useEffect(() => {
    setMinLoadingComplete(false);
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const showSkeleton = isLoading || !minLoadingComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const tickets = useMemo(() => ticketsRes?.data ?? [], [ticketsRes?.data]);
  const filteredTickets = useMemo(() => {
    if (!debouncedSearch.trim()) return tickets;
    const term = debouncedSearch.toLowerCase();
    return tickets.filter((ticket) => {
      return (
        ticket.subject?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term) ||
        ticket.customer_id?.toLowerCase().includes(term)
      );
    });
  }, [debouncedSearch, tickets]);

  const counts = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const pending = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const resolved = tickets.filter((ticket) => ticket.status === "resolved").length;
    const escalated = tickets.filter((ticket) => ticket.priority === "urgent").length;

    return {
      all: tickets.length,
      open,
      pending,
      resolved,
      escalated,
    };
  }, [tickets]);

  const handleResetFilters = () => {
    setStatus("all");
    setPriority("all");
    setBrand("all");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = async (ids: string[], newStatus: string) => {
    await Promise.all(ids.map((id) => updateTicket({ ticketId: id, status: newStatus })));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async (ids: string[]) => {
    await Promise.all(ids.map((id) => deleteTicket(id)));
    setSelectedIds(new Set());
  };

  const avgResponseTime =
    stats?.avg_resolution_time_hours !== null && stats?.avg_resolution_time_hours !== undefined
      ? `${Number(stats.avg_resolution_time_hours).toFixed(1)}h`
      : "2.4h";

  return (
    <motion.div
      className="space-y-8 pb-6 text-left"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                Support queue
              </h1>
              <p className="text-xs text-text-muted">
                Live tickets, AI triage signals, and human handoff work for D2C brands.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/tickets">
            <Button variant="primary" size="sm" className="h-9">
              Full queue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── Metric Cards with Shimmer Loading Skeletons ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {showSkeleton ? (
          <>
            <QueueMetricSkeleton />
            <QueueMetricSkeleton />
            <QueueMetricSkeleton />
            <QueueMetricSkeleton />
          </>
        ) : (
          <>
            <QueueMetric
              title="Open"
              value={metricLabel(stats?.tickets_by_status?.open ?? counts.open)}
              detail="Waiting for first action"
              icon={MessageSquare}
              tone="amber"
            />
            <QueueMetric
              title="Pending"
              value={counts.pending}
              detail="In human follow-up"
              icon={Clock3}
              tone="indigo"
            />
            <QueueMetric
              title="Resolved"
              value={metricLabel(stats?.tickets_by_status?.resolved ?? counts.resolved)}
              detail="Closed this view"
              icon={CheckCircle2}
              tone="emerald"
            />
            <QueueMetric
              title="Escalated"
              value={counts.escalated}
              detail={`Average resolution ${avgResponseTime}`}
              icon={AlertTriangle}
              tone="red"
            />
          </>
        )}
      </motion.div>

      {/* ── AI Insights and Escalations with Skeletons ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        {showSkeleton ? (
          <>
            <AISummaryCardSkeleton />
            <RecentEscalationsSkeleton />
          </>
        ) : (
          <>
            <AISummaryCard tickets={filteredTickets} />
            <RecentEscalations tickets={filteredTickets} />
          </>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <TicketFilters
          status={status}
          priority={priority}
          brand={brand}
          search={search}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onPriorityChange={(value) => {
            setPriority(value);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onBrandChange={(value) => {
            setBrand(value);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onSearchChange={setSearch}
          onReset={handleResetFilters}
          statusCounts={counts}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <TicketTable
          tickets={filteredTickets}
          isLoading={showSkeleton}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between border-t border-border pt-4 text-xs text-text-muted"
      >
        <span>
          Page <span className="font-semibold text-text-primary">{page}</span> -{" "}
          <span className="font-semibold text-text-primary">{filteredTickets.length}</span> shown
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage((value) => Math.max(value - 1, 1));
              setSelectedIds(new Set());
            }}
            disabled={page === 1 || showSkeleton}
            className="h-8"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage((value) => value + 1);
              setSelectedIds(new Set());
            }}
            disabled={tickets.length < 12 || showSkeleton}
            className="h-8"
          >
            Next
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
