"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Ticket as TicketIcon,
  Sparkles,
  Clock,
  AlertTriangle,
  Inbox,
  UserMinus,
  Flame,
} from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import TicketTable from "@/components/tickets/TicketTable";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { CreateTicketPanel } from "@/components/tickets/CreateTicketPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getAIPriorityScore, getSLAInfo } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export default function TicketsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [brand, setBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [smartTab, setSmartTab] = useState<"all" | "active" | "escalated" | "sla" | "negative" | "unassigned">("active");

  const { useListTickets, updateTicket, deleteTicket } = useTickets();
  const { data: ticketsRes, isLoading, refetch, isRefetching } = useListTickets({
    page,
    limit: 15, // High density pagination
    status_filter: status,
    priority_filter: priority,
    brand_filter: brand,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const ticketsList = useMemo(() => ticketsRes?.data ?? [], [ticketsRes?.data]);

  const filteredTickets = useMemo(() => {
    let list = ticketsList;

    // Apply Smart Tab filter
    if (smartTab === "active") {
      list = list.filter((ticket) => ticket.status !== "resolved");
    } else if (smartTab === "escalated") {
      list = list.filter((ticket) => {
        const score = getAIPriorityScore(ticket.id, ticket.priority, ticket.sentiment);
        return ticket.priority === "urgent" || score >= 90;
      });
    } else if (smartTab === "sla") {
      list = list.filter((ticket) => {
        if (ticket.status === "resolved") return false;
        let hoursLimit = 48;
        if (ticket.priority === "urgent") hoursLimit = 4;
        else if (ticket.priority === "high") hoursLimit = 12;
        else if (ticket.priority === "medium") hoursLimit = 24;
        const limitTime = new Date(ticket.created_at).getTime() + hoursLimit * 60 * 60 * 1000;
        const remainingMs = limitTime - Date.now();
        return remainingMs < 2 * 60 * 60 * 1000; // Less than 2 hours left or overdue
      });
    } else if (smartTab === "negative") {
      list = list.filter((ticket) => ticket.sentiment === "negative" && ticket.status !== "resolved");
    } else if (smartTab === "unassigned") {
      list = list.filter((ticket) => !ticket.assigned_agent_id && ticket.status !== "resolved");
    }

    if (!debouncedSearch.trim()) return list;
    const term = debouncedSearch.toLowerCase();
    return list.filter((ticket) => {
      return (
        ticket.subject?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term) ||
        ticket.customer_id?.toLowerCase().includes(term)
      );
    });
  }, [debouncedSearch, ticketsList, smartTab]);

  const counts = useMemo(() => {
    return {
      all: ticketsList.length,
      open: ticketsList.filter((ticket) => ticket.status === "open").length,
      pending: ticketsList.filter((ticket) => ticket.status === "in_progress").length,
      resolved: ticketsList.filter((ticket) => ticket.status === "resolved").length,
      escalated: ticketsList.filter((ticket) => {
        const score = getAIPriorityScore(ticket.id, ticket.priority, ticket.sentiment);
        return ticket.priority === "urgent" || score >= 90;
      }).length,
    };
  }, [ticketsList]);

  const handleResetFilters = () => {
    setStatus("all");
    setPriority("all");
    setBrand("all");
    setSearch("");
    setDebouncedSearch("");
    setSmartTab("active");
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = async (ids: string[], newStatus: string) => {
    await Promise.all(ids.map((id) => updateTicket({ ticketId: id, status: newStatus })));
    setSelectedIds(new Set());
    toast.success(`${ids.length} ticket${ids.length === 1 ? "" : "s"} updated.`);
  };

  const handleBulkDelete = async (ids: string[]) => {
    await Promise.all(ids.map((id) => deleteTicket(id)));
    setSelectedIds(new Set());
    toast.success(`${ids.length} ticket${ids.length === 1 ? "" : "s"} archived.`);
  };

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.error("No tickets to export.");
      return;
    }

    const headers = ["ID", "Subject", "Status", "Priority", "Sentiment", "Agent", "Created"];
    const rows = filteredTickets.map((ticket) => [
      ticket.id,
      `"${(ticket.subject || "").replace(/"/g, '""')}"`,
      ticket.status,
      ticket.priority,
      ticket.sentiment,
      ticket.assigned_agent_id || "Unassigned",
      ticket.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resolveiq-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  return (
    <motion.div
      className="space-y-6 pb-6 text-left"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-border/40 pb-5"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                ResolveIQ Queue
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  AI-First OS
                </span>
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                AI priority scoring, SLA countdown tracking, and smart intent routing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="h-9"
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="h-9"
            disabled={isLoading}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreatePanel(true)}
            className="h-9"
          >
            <Plus className="h-4 w-4" />
            Create ticket
          </Button>
        </div>
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

      <motion.div variants={fadeUp} className="space-y-4">
        {/* Smart tabs row */}
        <div className="flex border-b border-border overflow-x-auto select-none scrollbar-none gap-2">
          {[
            { id: "active", label: "Active Queue", icon: Sparkles, count: ticketsList.filter(t => t.status !== "resolved").length },
            { id: "escalated", label: "AI Escalated", icon: AlertTriangle, count: ticketsList.filter(t => {
              const score = getAIPriorityScore(t.id, t.priority, t.sentiment);
              return t.priority === "urgent" || score >= 90;
            }).length },
            { id: "sla", label: "SLA Breaching", icon: Clock, count: ticketsList.filter(t => {
              if (t.status === "resolved") return false;
              let hoursLimit = 48;
              if (t.priority === "urgent") hoursLimit = 4;
              else if (t.priority === "high") hoursLimit = 12;
              else if (t.priority === "medium") hoursLimit = 24;
              const limitTime = new Date(t.created_at).getTime() + hoursLimit * 60 * 60 * 1000;
              return (limitTime - Date.now()) < 2 * 60 * 60 * 1000;
            }).length },
            { id: "negative", label: "Negative Sentiment", icon: Flame, count: ticketsList.filter(t => t.sentiment === "negative" && t.status !== "resolved").length },
            { id: "unassigned", label: "Unassigned", icon: UserMinus, count: ticketsList.filter(t => !t.assigned_agent_id && t.status !== "resolved").length },
            { id: "all", label: "All Tickets", icon: Inbox, count: ticketsList.length },
          ].map((tab) => {
            const isActive = smartTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSmartTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary hover:border-slate-300"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <TicketTable
          tickets={filteredTickets}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <TicketIcon className="h-3.5 w-3.5" />
          <span>
            Page <span className="font-semibold text-text-primary">{page}</span> -{" "}
            <span className="font-semibold text-text-primary">{filteredTickets.length}</span>{" "}
            results
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage((value) => Math.max(value - 1, 1));
              setSelectedIds(new Set());
            }}
            disabled={page === 1 || isLoading}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
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
            disabled={ticketsList.length < 10 || isLoading}
            className="h-8"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <CreateTicketPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
      />
    </motion.div>
  );
}
