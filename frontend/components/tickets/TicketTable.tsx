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
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="animate-pulse">
        <div className="grid grid-cols-[40px_1.8fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr_88px] gap-4 border-b border-border bg-slate-50 px-4 py-3.5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-3 rounded bg-slate-200" />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[40px_1.8fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr_88px] gap-4 border-b border-border/70 px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: 8 }).map((_, index) => (
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white p-14 text-center shadow-sm">
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
}: {
  label: string;
  field: SortField;
  currentSort: SortField | null;
  currentDir: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary"
      >
        <span>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-35" />
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

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="w-12">
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
              <SortableHead label="Conversation" field="subject" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" field="status" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Priority" field="priority" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Sentiment" field="sentiment" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Created" field="created_at" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
              <TableHead className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Owner</TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wide text-text-muted">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => {
              const isSelected = selectedIds.has(ticket.id);
              const isEscalated = ticket.priority === "urgent";

              return (
                <TableRow
                  key={ticket.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "hover:bg-slate-50/80",
                    isSelected && "bg-primary/[0.04]",
                    isEscalated && "bg-red-50/30"
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(ticket.id)}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </TableCell>

                  <TableCell
                    className="min-w-[260px] max-w-[360px]"
                    onMouseEnter={() => prefetchTicket(ticket.id)}
                  >
                    <Link href={`/tickets/${ticket.id}`} className="group block">
                      <p className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-primary">
                        {truncateText(ticket.subject || "Untitled support request", 58)}
                      </p>
                      <span className="mt-0.5 block text-[10px] font-medium text-text-muted">
                        #{ticket.id.slice(0, 8)} · customer {ticket.customer_id?.slice(0, 6)}
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Badge className={getStatusColor(ticket.status)}>
                      {statusLabel(ticket.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {priorityLabel(ticket.priority)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        getSentimentColor(ticket.sentiment)
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          SENTIMENT_DOT_COLOR[ticket.sentiment] || "bg-slate-400"
                        )}
                      />
                      <span className="capitalize">{ticket.sentiment}</span>
                    </span>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-xs text-text-muted">
                    {formatDate(ticket.created_at, "MMM dd, yyyy")}
                  </TableCell>

                  <TableCell className="text-xs text-text-muted">
                    {ticket.assigned_agent_id ? (
                      <span className="rounded-md border border-border bg-white px-2 py-1 text-[10px] font-medium text-text-primary">
                        {ticket.assigned_agent_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
                        Unassigned
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onAssign && !ticket.assigned_agent_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssign(ticket.id)}
                          className="h-8 w-8 p-0 text-text-muted hover:text-primary"
                          title="Assign agent"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2.5 text-[11px]"
                          title="Open ticket"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-text-muted"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
