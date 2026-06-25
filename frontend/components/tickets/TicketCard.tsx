import { Ticket } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { getPriorityColor, getStatusColor, getSentimentColor, formatRelativeTime } from "@/lib/utils";
import { Calendar, ShieldAlert } from "lucide-react";

interface TicketCardProps {
  ticket: Ticket;
  isActive?: boolean;
  onClick?: () => void;
}

export function TicketCard({ ticket, isActive = false, onClick }: TicketCardProps) {
  const { subject, status, priority, sentiment, updated_at } = ticket;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left relative overflow-hidden group ${
        isActive
          ? "bg-primary/5 border-primary"
          : "bg-surface/40 border-border/80 hover:bg-surface/60 hover:border-border"
      }`}
    >
      {!isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(status)}>
            {status?.replace("_", " ")}
          </Badge>
          <Badge className={getPriorityColor(priority)}>
            {priority}
          </Badge>
        </div>
        
        {priority === "urgent" && status !== "resolved" && (
          <ShieldAlert className="h-4 w-4 text-danger animate-pulse" />
        )}
      </div>

      <h4 className="text-sm font-semibold text-text-primary font-heading line-clamp-1 group-hover:text-primary transition-colors mb-2">
        {subject || "No Subject"}
      </h4>

      <div className="flex items-center justify-between text-[10px] text-text-muted mt-4 border-t border-border/40 pt-2.5">
        <span className={`px-1.5 py-0.5 rounded ${getSentimentColor(sentiment)} font-medium`}>
          Sentiment: {sentiment}
        </span>
        <span className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeTime(updated_at)}</span>
        </span>
      </div>
    </div>
  );
}
