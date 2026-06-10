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
} from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import TicketTable from "@/components/tickets/TicketTable";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { CreateTicketPanel } from "@/components/tickets/CreateTicketPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const { useListTickets, updateTicket, deleteTicket } = useTickets();
  const { data: ticketsRes, isLoading, refetch, isRefetching } = useListTickets({
    page,
    limit: 10,
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
    if (!debouncedSearch.trim()) return ticketsList;
    const term = debouncedSearch.toLowerCase();
    return ticketsList.filter((ticket) => {
      return (
        ticket.subject?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term) ||
        ticket.customer_id?.toLowerCase().includes(term)
      );
    });
  }, [debouncedSearch, ticketsList]);

  const counts = useMemo(() => {
    return {
      all: ticketsList.length,
      open: ticketsList.filter((ticket) => ticket.status === "open").length,
      pending: ticketsList.filter((ticket) => ticket.status === "in_progress").length,
      resolved: ticketsList.filter((ticket) => ticket.status === "resolved").length,
      escalated: ticketsList.filter((ticket) => ticket.priority === "urgent").length,
    };
  }, [ticketsList]);

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
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <TicketIcon className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                Tickets
              </h1>
              <p className="text-xs text-text-muted">
                Search, filter, bulk update, and resolve customer support threads.
              </p>
            </div>
          </div>
          {!isLoading && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="warning">{counts.open} open</Badge>
              <Badge variant="default">{counts.pending} pending</Badge>
              <Badge variant="success">{counts.resolved} resolved</Badge>
              <Badge variant="danger">{counts.escalated} escalated</Badge>
            </div>
          )}
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
