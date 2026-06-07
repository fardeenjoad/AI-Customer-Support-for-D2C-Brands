"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTickets } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import TicketTable from "@/components/tickets/TicketTable";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { CreateTicketPanel } from "@/components/tickets/CreateTicketPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Download,
  Ticket,
} from "lucide-react";

// ── Fade-up animation ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function TicketsPage() {
  // ── Filters ──
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [brand, setBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Create panel ──
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Debounced search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Data hooks ──
  const { useListTickets, updateTicket, deleteTicket } = useTickets();
  const { data: ticketsRes, isLoading, refetch, isRefetching } =
    useListTickets({
      page,
      limit: 10,
      status_filter: status,
      priority_filter: priority,
      brand_filter: brand,
    });

  const ticketsList = ticketsRes?.data || [];

  // Client-side search filter
  const filteredTickets = ticketsList.filter((ticket) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      ticket.subject?.toLowerCase().includes(term) ||
      ticket.id?.toLowerCase().includes(term)
    );
  });

  // ── Reset ──
  const handleResetFilters = () => {
    setStatus("all");
    setPriority("all");
    setBrand("all");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setSelectedIds(new Set());
  };

  // ── Bulk Actions ──
  const handleBulkStatusChange = async (ids: string[], newStatus: string) => {
    try {
      await Promise.all(
        ids.map((id) => updateTicket({ ticketId: id, status: newStatus }))
      );
      setSelectedIds(new Set());
      toast.success(
        `${ids.length} ticket${ids.length > 1 ? "s" : ""} updated to ${newStatus.replace("_", " ")}`
      );
    } catch {
      // handled in hook
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteTicket(id)));
      setSelectedIds(new Set());
      toast.success(
        `${ids.length} ticket${ids.length > 1 ? "s" : ""} archived`
      );
    } catch {
      // handled in hook
    }
  };

  // ── CSV Export ──
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.error("No tickets to export.");
      return;
    }
    const headers = [
      "ID",
      "Subject",
      "Status",
      "Priority",
      "Sentiment",
      "Agent",
      "Created",
    ];
    const rows = filteredTickets.map((t) => [
      t.id,
      `"${(t.subject || "").replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.sentiment,
      t.assigned_agent_id || "Unassigned",
      t.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resolveiq-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  // ── Derived counts ──
  const openCount = ticketsList.filter((t) => t.status === "open").length;
  const inProgressCount = ticketsList.filter(
    (t) => t.status === "in_progress"
  ).length;

  return (
    <motion.div
      className="space-y-6 text-left pb-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 rounded-full gradient-primary" />
            <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
              Support Queue
            </h2>
          </div>
          <div className="flex items-center space-x-3 pl-[1.4rem]">
            <p className="text-xs text-text-muted">
              Manage, filter, and resolve customer support tickets.
            </p>
            {!isLoading && (
              <div className="flex items-center space-x-2">
                <Badge variant="info" className="text-[10px]">
                  {openCount} open
                </Badge>
                <Badge variant="warning" className="text-[10px]">
                  {inProgressCount} in progress
                </Badge>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 flex items-center space-x-1.5"
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span className="text-xs max-sm:hidden">Refresh</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3 flex items-center space-x-1.5"
            disabled={isLoading}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="text-xs max-sm:hidden">Export</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreatePanel(true)}
            className="h-9 px-4 flex items-center space-x-1.5 shadow-glow"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-semibold">Create Ticket</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div variants={fadeUp}>
        <TicketFilters
          status={status}
          priority={priority}
          brand={brand}
          search={search}
          onStatusChange={(val) => {
            setStatus(val);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onPriorityChange={(val) => {
            setPriority(val);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onBrandChange={(val) => {
            setBrand(val);
            setPage(1);
            setSelectedIds(new Set());
          }}
          onSearchChange={setSearch}
          onReset={handleResetFilters}
        />
      </motion.div>

      {/* ── Table ── */}
      <motion.div variants={fadeUp}>
        <TicketTable
          tickets={filteredTickets}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
        />
      </motion.div>

      {/* ── Pagination ── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between border-t border-border/40 pt-4"
      >
        <div className="flex items-center space-x-2">
          <Ticket className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">
            Page <span className="text-text-primary font-bold">{page}</span>
            {" · "}
            <span className="text-text-primary font-semibold">
              {filteredTickets.length}
            </span>{" "}
            results
          </span>
        </div>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage((p) => Math.max(p - 1, 1));
              setSelectedIds(new Set());
            }}
            disabled={page === 1 || isLoading}
            className="h-8 px-3 flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[11px] max-sm:hidden">Previous</span>
          </Button>

          {/* Page Indicators */}
          <div className="hidden sm:flex items-center space-x-1">
            {Array.from(
              { length: Math.min(5, Math.max(page + 1, 3)) },
              (_, i) => i + 1
            ).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPage(p);
                  setSelectedIds(new Set());
                }}
                className={`h-8 w-8 rounded-md text-xs font-semibold transition-all ${
                  p === page
                    ? "gradient-primary text-text-primary shadow-glow"
                    : "bg-surface border border-border text-text-muted hover:text-text-primary hover:border-primary/40"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage((p) => p + 1);
              setSelectedIds(new Set());
            }}
            disabled={ticketsList.length < 10 || isLoading}
            className="h-8 px-3 flex items-center space-x-1"
          >
            <span className="text-[11px] max-sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Create Ticket Panel ── */}
      <CreateTicketPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
      />
    </motion.div>
  );
}
