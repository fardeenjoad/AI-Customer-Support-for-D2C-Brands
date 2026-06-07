import { useState } from "react";
import { Ticket } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPriorityColor, getStatusColor, getSentimentColor, formatDate } from "@/lib/utils";
import { User, ShieldAlert, Calendar } from "lucide-react";
import { toast } from "sonner";

interface TicketDetailProps {
  ticket: Ticket;
  onUpdateTicket: (payload: { status?: string; priority?: string; assigned_agent_id?: string | null }) => Promise<void>;
  isUpdating?: boolean;
}

export function TicketDetail({ ticket, onUpdateTicket, isUpdating = false }: TicketDetailProps) {
  const { id, customer_id, brand_id, status, priority, sentiment, assigned_agent_id, created_at } = ticket;
  const [agentInputId, setAgentInputId] = useState("");
  const [isAssignFormOpen, setIsAssignFormOpen] = useState(false);

  const { assignAgent, isAssigning } = useAnalytics();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdateTicket({ status: newStatus });
    } catch (error) {
      console.error("Status update error", error);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await onUpdateTicket({ priority: newPriority });
    } catch (error) {
      console.error("Priority update error", error);
    }
  };

  const handleAgentAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentInputId.trim()) return;

    try {
      await assignAgent({ ticketId: id, agentId: agentInputId.trim() });
      toast.success("Agent assigned successfully!");
      setAgentInputId("");
      setIsAssignFormOpen(false);
    } catch (error) {
      console.error("Assignment error", error);
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border bg-surface/40 flex flex-col space-y-6">
      <div className="border-b border-border/60 pb-4 text-left">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-heading mb-1">
          Ticket Details
        </h3>
        <span className="text-[10px] text-text-muted font-mono block">
          UUID: {id}
        </span>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex flex-col space-y-1.5 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Status
          </span>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(status)}>
              {status?.replace("_", " ")}
            </Badge>
            <select
              value={status}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-surface border border-border/80 rounded-md px-2.5 py-1 text-xs text-text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Priority */}
        <div className="flex flex-col space-y-1.5 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Priority
          </span>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(priority)}>
              {priority}
            </Badge>
            <select
              value={priority}
              disabled={isUpdating}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="bg-surface border border-border/80 rounded-md px-2.5 py-1 text-xs text-text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Sentiment */}
        <div className="flex flex-col space-y-1 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            AI Sentiment
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs border font-semibold ${getSentimentColor(sentiment)}`}>
              {sentiment}
            </span>
          </div>
        </div>

        {/* Scoped Brand */}
        <div className="flex flex-col space-y-1 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Brand ID
          </span>
          <span className="text-xs text-text-primary font-mono font-semibold bg-surface border border-border/80 px-2 py-1.5 rounded-md mt-1 w-full block truncate">
            {brand_id}
          </span>
        </div>

        {/* Customer ID */}
        <div className="flex flex-col space-y-1 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Customer ID
          </span>
          <span className="text-xs text-text-primary font-mono font-semibold bg-surface border border-border/80 px-2 py-1.5 rounded-md mt-1 w-full block truncate">
            {customer_id}
          </span>
        </div>

        {/* Opened At */}
        <div className="flex flex-col space-y-1 text-left">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Opened At
          </span>
          <div className="flex items-center space-x-1.5 text-xs text-text-muted mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(created_at)}</span>
          </div>
        </div>

        {/* Assigned Agent */}
        <div className="flex flex-col space-y-1.5 text-left border-t border-border/40 pt-4">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Assigned Agent
          </span>
          {assigned_agent_id ? (
            <div className="flex items-center justify-between bg-surface/50 border border-border/85 px-3 py-2 rounded-lg mt-1 w-full">
              <div className="flex items-center space-x-2 text-xs text-text-primary overflow-hidden">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-mono truncate">{assigned_agent_id.slice(0, 8)}...</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignFormOpen(!isAssignFormOpen)}
                className="h-6 px-1.5 text-[10px] text-text-muted hover:text-primary"
              >
                Reassign
              </Button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 mt-1">
              <div className="flex items-center justify-between bg-warning/5 border border-warning/20 px-3 py-2 rounded-lg w-full text-warning text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 animate-pulse" />
                  <span>Unassigned</span>
                </div>
                {!isAssignFormOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAssignFormOpen(true)}
                    className="h-6 px-1.5 text-[10px] text-warning hover:text-text-primary hover:bg-warning/10"
                  >
                    Assign
                  </Button>
                )}
              </div>
            </div>
          )}

          {isAssignFormOpen && (
            <form onSubmit={handleAgentAssignment} className="flex flex-col space-y-2.5 mt-2 bg-surface p-3 border border-border rounded-xl animate-scaleUp">
              <label className="text-[9px] text-text-muted font-bold tracking-wider uppercase">
                Agent ID (UUID)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Agent UUID"
                  value={agentInputId}
                  onChange={(e) => setAgentInputId(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAssigning}
                  className="h-8 text-[11px]"
                >
                  Save
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignFormOpen(false)}
                className="h-6 self-end text-[10px] text-text-muted"
              >
                Cancel
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
