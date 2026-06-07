import Link from "next/link";
import { Ticket } from "@/hooks/useTickets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPriorityColor, getStatusColor, getSentimentColor, formatDate } from "@/lib/utils";
import { ArrowRight, UserCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketTableProps {
  tickets: Ticket[];
  onAssign?: (ticketId: string) => void;
  isLoading?: boolean;
}

export default function TicketTable({ tickets, onAssign, isLoading }: TicketTableProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3 animate-pulse">
        <div className="h-10 w-full rounded bg-border/40" />
        <div className="h-12 w-full rounded bg-border/20" />
        <div className="h-12 w-full rounded bg-border/20" />
        <div className="h-12 w-full rounded bg-border/20" />
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface/10">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-surface border border-border/80 text-text-muted mb-4 shadow-sm">
          <Inbox className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-text-primary mb-1 font-heading">
          No support tickets found
        </h4>
        <p className="text-xs text-text-muted">
          All clean! There are no tickets matching this queue status.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/30">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Date Opened</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              {/* Subject */}
              <TableCell className="font-medium max-w-[240px]">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="hover:text-primary transition-colors block"
                >
                  <p className="truncate text-sm text-text-primary font-heading">
                    {ticket.subject || "No Subject"}
                  </p>
                  <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                    ID: {ticket.id.slice(0, 8)}...
                  </span>
                </Link>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge
                  className={getStatusColor(ticket.status)}
                >
                  {ticket.status?.replace("_", " ")}
                </Badge>
              </TableCell>

              {/* Priority */}
              <TableCell>
                <Badge
                  className={getPriorityColor(ticket.priority)}
                >
                  {ticket.priority}
                </Badge>
              </TableCell>

              {/* Sentiment */}
              <TableCell>
                <span
                  className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${getSentimentColor(
                    ticket.sentiment
                  )}`}
                >
                  {ticket.sentiment}
                </span>
              </TableCell>

              {/* Created Date */}
              <TableCell className="text-xs text-text-muted">
                {formatDate(ticket.created_at, "MMM dd, yyyy")}
              </TableCell>

              {/* Assigned Agent */}
              <TableCell className="text-xs text-text-muted font-mono">
                {ticket.assigned_agent_id ? (
                  <span className="text-text-primary bg-surface border border-border/80 px-2 py-1 rounded-md text-[10px]">
                    Agent: {ticket.assigned_agent_id.slice(0, 8)}
                  </span>
                ) : (
                  <span className="text-warning text-[10px] bg-warning/5 border border-warning/15 px-2 py-1 rounded-md animate-pulse">
                    Unassigned
                  </span>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  {onAssign && !ticket.assigned_agent_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssign(ticket.id)}
                      className="h-8 w-8 p-0 text-text-muted hover:text-primary"
                      title="Assign Agent"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Link href={`/tickets/${ticket.id}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3 text-[11px] text-text-primary flex items-center space-x-1.5"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
