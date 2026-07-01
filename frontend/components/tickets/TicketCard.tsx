import { Ticket } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { getPriorityColor, getStatusColor, getSentimentIcon, getSentimentTextColor, formatRelativeTime } from "@/lib/utils";
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
      className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none text-left relative overflow-hidden group ${
        isActive
          ? "bg-indigo-50 border-indigo-200 border-l-2 border-indigo-500 text-indigo-900"
          : "bg-surface/40 border-border/80 hover:bg-gray-50 text-text-muted hover:text-text-primary"
      }`}
    >

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

      <h4 className="text-sm font-semibold text-text-primary font-heading truncate group-hover:text-indigo-600 transition-colors mb-2">
        {subject || "No Subject"}
      </h4>

      <div className="flex items-center justify-between text-[10px] text-text-muted mt-4 border-t border-border/40 pt-2.5">
        <span className="flex items-center space-x-1 font-medium select-none">
          <span className="text-xs">{getSentimentIcon(sentiment)}</span>
          <span className={getSentimentTextColor(sentiment)}>
            {sentiment ? sentiment.charAt(0).toUpperCase() + sentiment.slice(1) : ""}
          </span>
        </span>
        <span className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeTime(updated_at)}</span>
        </span>
      </div>
    </div>
  );
}
