"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Inbox,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  UserCheck,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/axios";
import { Ticket } from "@/hooks/useTickets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cn,
  formatDate,
  getPriorityColor,
  getSentimentColor,
  getStatusColor,
  truncateText,
  getSLAInfo,
  getAIPriorityScore,
} from "@/lib/utils";

type SortField = "subject" | "status" | "priority" | "sentiment" | "created_at";
type SortDirection = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

const SENTIMENT_ORDER: Record<string, number> = {
  positive: 0,
  neutral: 1,
  negative: 2,
};

const SENTIMENT_DOT_COLOR: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  negative: "bg-red-500",
};

interface TicketTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onAssign?: (ticketId: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
}

function statusLabel(status: string) {
  if (status === "in_progress") return "pending";
  return status?.replace("_", " ") || "open";
}

function priorityLabel(priority: string) {
  if (priority === "urgent") return "escalated";
  return priority || "low";
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="animate-pulse">
        <div className="grid grid-cols-[40px_1.5fr_0.6fr_0.6fr_0.6fr_0.7fr_0.6fr_100px_120px] gap-3 border-b border-border bg-slate-50 px-4 py-3.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-3 rounded bg-slate-200" />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[40px_1.5fr_0.6fr_0.6fr_0.6fr_0.7fr_0.6fr_100px_120px] gap-3 border-b border-border/70 px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className={cn("h-3 rounded bg-slate-100", index === 1 && "h-8")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white p-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-slate-50 text-text-muted">
        <Inbox className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-semibold text-text-primary">No tickets found</h4>
      <p className="mt-1 max-w-[280px] text-xs text-text-muted">
        No conversations match the current filters.
      </p>
    </div>
  );
}

function SortableHead({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField | null;
  currentDir: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort === field;

  return (
    <TableHead className={cn("flex items-center h-full px-2 py-0", className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide transition-colors hover:text-gray-900 whitespace-nowrap"
      >
        <span>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-35 shrink-0" />
        )}
      </button>
    </TableHead>
  );
}

export default function TicketTable({
  tickets,
  isLoading,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  onAssign,
  onBulkDelete,
  onBulkStatusChange,
}: TicketTableProps) {
  const queryClient = useQueryClient();
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const selectedIds = externalSelectedIds ?? internalSelected;
  const setSelectedIds = onSelectionChange ?? setInternalSelected;

  const prefetchTicket = (ticketId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["ticket", ticketId],
      queryFn: async () => {
        const response = await api.get(`/tickets/${ticketId}`);
        return response.data;
      },
      staleTime: 60000,
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDir("desc");
  };

  const sortedTickets = useMemo(() => {
    if (!sortField) return tickets;

    return [...tickets].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "subject":
          comparison = (a.subject || "").localeCompare(b.subject || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "priority":
          comparison = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "sentiment":
          comparison = (SENTIMENT_ORDER[a.sentiment] ?? 1) - (SENTIMENT_ORDER[b.sentiment] ?? 1);
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [tickets, sortField, sortDir]);

  const allSelected =
    sortedTickets.length > 0 && sortedTickets.every((ticket) => selectedIds.has(ticket.id));
  const someSelected = sortedTickets.some((ticket) => selectedIds.has(ticket.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(sortedTickets.map((ticket) => ticket.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  if (isLoading) return <TableSkeleton />;
  if (!tickets || tickets.length === 0) return <EmptyState />;

  const bulkCount = selectedIds.size;

  return (
    <div className="space-y-3">
      {bulkCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-xs font-bold text-primary">
            {bulkCount} ticket{bulkCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onBulkStatusChange && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBulkStatusChange(Array.from(selectedIds), "in_progress")}
                  className="h-7 text-[11px] text-text-muted hover:text-primary"
                >
                  <RefreshCw className="h-3 w-3" />
                  Mark pending
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBulkStatusChange(Array.from(selectedIds), "resolved")}
                  className="h-7 text-[11px] text-text-muted hover:text-emerald-700"
                >
                  Mark resolved
                </Button>
              </>
            )}
            {onBulkDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBulkDelete(Array.from(selectedIds))}
                className="h-7 text-[11px] text-text-muted hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
                Archive
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 text-[11px] text-text-muted"
            >
              Clear
            </Button>
          </div>
        </motion.div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/10">
        <div className="overflow-x-auto">
          <Table className="w-[1186px] block">
          <TableHeader className="bg-slate-50/70 border-b border-border block">
            <TableRow
              className="grid items-center h-10 px-4 gap-x-2 bg-[#f8fafc]"
              style={{ gridTemplateColumns: "40px 280px 110px 120px 130px 110px 120px 130px 110px 36px" }}
            >
              <TableHead className="flex items-center h-full px-2 py-0 sticky left-0 z-10 bg-[#f8fafc]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(element) => {
                    if (element) element.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
              </TableHead>
              <SortableHead label="Conversation" field="subject" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="sticky left-[40px] z-10 border-r border-gray-100 bg-[#f8fafc]" />
              <SortableHead label="Status" field="status" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Priority" field="priority" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Sentiment" field="sentiment" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <TableHead className="flex items-center h-full px-2 py-0 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">SLA</TableHead>
              <SortableHead label="Created" field="created_at" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <TableHead className="flex items-center h-full px-2 py-0 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Owner</TableHead>
              <TableHead className="flex items-center h-full px-2 py-0 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Action</TableHead>
              <TableHead className="flex items-center h-full px-2 py-0" />
            </TableRow>
          </TableHeader>
          <TableBody className="block divide-y divide-gray-100">
            {sortedTickets.map((ticket) => {
              const isSelected = selectedIds.has(ticket.id);
              const priorityScore = getAIPriorityScore(ticket.id, ticket.priority, ticket.sentiment);
              const isEscalated = ticket.priority === "urgent" || priorityScore >= 90;
              const sla = getSLAInfo(ticket.created_at, ticket.priority, ticket.status);

              return (
                <TableRow
                  key={ticket.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "grid items-center h-[88px] border-b border-gray-100 transition-colors duration-150 px-4 py-2 gap-x-2",
                    isSelected ? "bg-slate-50" : isEscalated ? "bg-purple-50/10" : "bg-white"
                  )}
                  style={{ gridTemplateColumns: "40px 280px 110px 120px 130px 110px 120px 130px 110px 36px" }}
                >
                  <TableCell className={cn("flex items-center h-full px-2 py-0 sticky left-0 z-10", isSelected ? "bg-slate-50" : isEscalated ? "bg-[#fbf9ff]" : "bg-white")}>
                    <div className="flex items-center h-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(ticket.id)}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                      />
                    </div>
                  </TableCell>

                  <TableCell
                    className={cn("flex items-center h-full px-2 py-0 sticky left-[40px] z-10 border-r border-gray-100 max-w-[320px]", isSelected ? "bg-slate-50" : isEscalated ? "bg-[#fbf9ff]" : "bg-white")}
                    onMouseEnter={() => prefetchTicket(ticket.id)}
                  >
                    <Link href={`/tickets/${ticket.id}`} className="group flex flex-col justify-center py-2 space-y-1 w-full">
                      <p className="text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-primary leading-snug truncate">
                        {truncateText(ticket.subject || "Untitled support request", 40)}
                      </p>
                      <div className="text-xs text-gray-400 font-normal leading-none">
                        <span className="font-mono">#{ticket.id.slice(0, 8)}</span> · customer <span className="font-mono">{ticket.customer_id?.slice(0, 6)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded border font-mono tracking-tight whitespace-nowrap",
                          priorityScore >= 90 ? "bg-red-50 text-red-700 border-red-200" :
                          priorityScore >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-indigo-50 text-primary border-indigo-100"
                        )}>
                          AI Priority: {priorityScore}
                        </span>
                        {isEscalated && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-0.5 whitespace-nowrap">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI Escalated
                          </span>
                        )}
                      </div>
                    </Link>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <div className="flex items-center h-8">
                      <Badge className={cn("h-6 px-2.5 text-xs font-medium rounded-md inline-flex items-center justify-center select-none uppercase tracking-wider whitespace-nowrap", getStatusColor(ticket.status))}>
                        {statusLabel(ticket.status)}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <div className="flex items-center h-8">
                      <Badge className={cn("h-6 px-2.5 text-xs font-medium rounded-md inline-flex items-center justify-center select-none uppercase tracking-wider whitespace-nowrap", getPriorityColor(ticket.priority))}>
                        {priorityLabel(ticket.priority)}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <div className="flex items-center h-8">
                      <Badge
                        className={cn(
                          "h-6 px-2.5 text-xs font-medium rounded-md inline-flex items-center justify-center select-none uppercase tracking-wider gap-1.5 whitespace-nowrap",
                          getSentimentColor(ticket.sentiment)
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            SENTIMENT_DOT_COLOR[ticket.sentiment] || "bg-slate-400"
                          )}
                        />
                        <span>{ticket.sentiment}</span>
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <div className="flex items-center h-8">
                      <span className={cn("h-6 px-2.5 text-xs font-medium rounded-md inline-flex items-center justify-center border gap-1 whitespace-nowrap", sla.color)}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{sla.text}</span>
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0 text-xs text-text-muted whitespace-nowrap">
                    <div className="flex items-center h-8">
                      {formatDate(ticket.created_at, "MMM dd, yyyy")}
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <div className="flex items-center gap-1.5 w-full" title={ticket.assigned_agent_id || "Unassigned"}>
                      {ticket.assigned_agent_id ? (
                        <span className="inline-flex items-center justify-center h-9 w-24 px-3 rounded-md border border-border bg-white text-xs font-medium text-text-primary select-none whitespace-nowrap">
                          {ticket.assigned_agent_id.slice(0, 8)}
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center justify-center h-9 w-20 px-2 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 select-none whitespace-nowrap">
                            Unassigned
                          </span>
                          {onAssign && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAssign(ticket.id)}
                              className="h-8 w-8 p-0 text-text-muted hover:text-primary hover:bg-gray-100 rounded-md flex items-center justify-center shrink-0"
                              title="Assign agent"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <Link href={`/tickets/${ticket.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 px-3 text-xs hover:bg-gray-100 rounded-md flex items-center gap-1.5 whitespace-nowrap"
                        title="Open ticket"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </Button>
                    </Link>
                  </TableCell>

                  <TableCell className="flex items-center h-full px-2 py-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-text-muted hover:bg-gray-100 rounded-md flex items-center justify-center shrink-0"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4 shrink-0" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
