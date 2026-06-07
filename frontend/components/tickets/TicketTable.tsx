"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
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
  getPriorityColor,
  getStatusColor,
  getSentimentColor,
  formatDate,
  truncateText,
} from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  Inbox,
  Trash2,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Sentiment Emoji Map ──
const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😡",
};

// ── Sort Types ──
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

// ── Props ──
interface TicketTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onAssign?: (ticketId: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
}

// ── Skeleton ──
function TableSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/20">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center px-4 py-3.5 bg-surface/30 border-b border-border gap-4">
          <div className="w-5 h-5 rounded bg-border/40 shrink-0" />
          {[120, 60, 60, 60, 80, 60, 50].map((w, i) => (
            <div
              key={i}
              className="h-3.5 rounded bg-border/40"
              style={{ width: w, flexShrink: 0 }}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center px-4 py-4 border-b border-border/40 gap-4"
          >
            <div className="w-5 h-5 rounded bg-border/30 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-border/30" />
              <div className="h-2.5 w-1/3 rounded bg-border/20" />
            </div>
            <div className="h-5 w-16 rounded-full bg-border/25" />
            <div className="h-5 w-14 rounded-full bg-border/25" />
            <div className="h-4 w-12 rounded bg-border/20" />
            <div className="h-3.5 w-20 rounded bg-border/20" />
            <div className="h-4 w-16 rounded bg-border/25" />
            <div className="h-7 w-14 rounded bg-border/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ──
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border/60 rounded-xl bg-surface/10">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border/80 text-text-muted mb-5 shadow-sm">
        <Inbox className="h-7 w-7" />
      </div>
      <h4 className="text-sm font-semibold text-text-primary mb-1.5 font-heading">
        No tickets found
      </h4>
      <p className="text-xs text-text-muted max-w-[280px]">
        The queue is empty. No tickets match the current filters.
      </p>
    </div>
  );
}

// ── Sortable Header ──
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
  onSort: (f: SortField) => void;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className="flex items-center space-x-1.5 group hover:text-text-primary transition-colors"
      >
        <span>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    </TableHead>
  );
}

// ── Main Component ──
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

  // Prefetch ticket details on hover
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

  // Internal selection state (if not controlled externally)
  const [internalSelected, setInternalSelected] = useState<Set<string>>(
    new Set()
  );
  const selectedIds = externalSelectedIds ?? internalSelected;
  const setSelectedIds = onSelectionChange ?? setInternalSelected;

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedTickets = useMemo(() => {
    if (!sortField) return tickets;
    return [...tickets].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "subject":
          cmp = (a.subject || "").localeCompare(b.subject || "");
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "priority":
          cmp =
            (PRIORITY_ORDER[a.priority] ?? 0) -
            (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "sentiment":
          cmp =
            (SENTIMENT_ORDER[a.sentiment] ?? 1) -
            (SENTIMENT_ORDER[b.sentiment] ?? 1);
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tickets, sortField, sortDir]);

  // Selection
  const allSelected =
    sortedTickets.length > 0 &&
    sortedTickets.every((t) => selectedIds.has(t.id));
  const someSelected = sortedTickets.some((t) => selectedIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTickets.map((t) => t.id)));
    }
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

  // ── Renders ──
  if (isLoading) return <TableSkeleton />;
  if (!tickets || tickets.length === 0) return <EmptyState />;

  const bulkCount = selectedIds.size;

  return (
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      {bulkCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl px-4 py-3 flex items-center justify-between border border-primary/20 bg-primary/5"
        >
          <span className="text-xs font-bold text-primary">
            {bulkCount} ticket{bulkCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center space-x-2">
            {onBulkStatusChange && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onBulkStatusChange(Array.from(selectedIds), "in_progress")
                  }
                  className="h-7 text-[11px] text-text-muted hover:text-primary"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Mark In Progress
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onBulkStatusChange(Array.from(selectedIds), "resolved")
                  }
                  className="h-7 text-[11px] text-text-muted hover:text-success"
                >
                  Mark Resolved
                </Button>
              </>
            )}
            {onBulkDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBulkDelete(Array.from(selectedIds))}
                className="h-7 text-[11px] text-text-muted hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
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

      {/* Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/20">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox */}
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
              </TableHead>
              <SortableHead
                label="Subject"
                field="subject"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Status"
                field="status"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Priority"
                field="priority"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Sentiment"
                field="sentiment"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Created"
                field="created_at"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket, idx) => {
              const isSelected = selectedIds.has(ticket.id);
              return (
                <TableRow
                  key={ticket.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={isSelected ? "bg-primary/[0.04]" : ""}
                >
                  {/* Checkbox */}
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(ticket.id)}
                      className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                    />
                  </TableCell>

                  {/* Subject + ID */}
                  <TableCell className="font-medium max-w-[260px]" onMouseEnter={() => prefetchTicket(ticket.id)}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="hover:text-primary transition-colors block group"
                    >
                      <p className="truncate text-sm text-text-primary font-heading group-hover:text-primary transition-colors">
                        {truncateText(ticket.subject || "No Subject", 45)}
                      </p>
                      <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </Link>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>

                  {/* Sentiment */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-2 py-0.5 rounded-md ${getSentimentColor(
                        ticket.sentiment
                      )}`}
                    >
                      <span>{SENTIMENT_EMOJI[ticket.sentiment] || "😐"}</span>
                      <span className="capitalize">{ticket.sentiment}</span>
                    </span>
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-xs text-text-muted whitespace-nowrap">
                    {formatDate(ticket.created_at, "MMM dd, yyyy")}
                  </TableCell>

                  {/* Agent */}
                  <TableCell className="text-xs text-text-muted font-mono">
                    {ticket.assigned_agent_id ? (
                      <span className="text-text-primary bg-surface border border-border/80 px-2 py-1 rounded-md text-[10px]">
                        {ticket.assigned_agent_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-warning text-[10px] bg-warning/5 border border-warning/15 px-2 py-1 rounded-md">
                        Unassigned
                      </span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {onAssign && !ticket.assigned_agent_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssign(ticket.id)}
                          className="h-7 w-7 p-0 text-text-muted hover:text-primary"
                          title="Assign Agent"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] text-text-primary flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
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
