import { useState } from "react";
import { Ticket } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  getPriorityColor, 
  getStatusColor, 
  getSentimentColor, 
  formatDate, 
  getPrioritySelectClass, 
  getSentimentIcon, 
  getSentimentTextColor 
} from "@/lib/utils";
import { User, ShieldAlert, Calendar, Copy } from "lucide-react";
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
      <div className="border-b border-border/60 pb-4 text-left flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-heading mb-1">
            Ticket Details
          </h3>
          <span className="text-[10px] text-text-muted font-mono block">
            UUID: {id.slice(0, 8)}...
          </span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(id);
            toast.success("Ticket ID copied to clipboard!");
          }}
          title="Copy Ticket ID"
          className="text-text-muted hover:text-primary p-1 hover:bg-surface/50 rounded transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-y-4 text-left items-center">
        {/* Status */}
        {status && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Status
            </span>
            <div className="flex items-center space-x-1.5 justify-self-start">
              <Badge className={getStatusColor(status)}>
                {status?.replace("_", " ")}
              </Badge>
              <select
                value={status}
                disabled={isUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-surface border border-border/80 rounded-md px-1.5 py-0.5 text-[10px] text-text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </>
        )}

        {/* Priority */}
        {priority && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Priority
            </span>
            <div className="justify-self-start">
              <select
                value={priority}
                disabled={isUpdating}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`border rounded-md px-2 py-0.5 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 transition-colors ${getPrioritySelectClass(priority)}`}
              >
                <option value="low" className="bg-white text-slate-700">Low</option>
                <option value="medium" className="bg-white text-amber-700">Medium</option>
                <option value="high" className="bg-white text-orange-700">High</option>
                <option value="urgent" className="bg-white text-red-700">Urgent</option>
              </select>
            </div>
          </>
        )}

        {/* Sentiment */}
        {sentiment && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              AI Sentiment
            </span>
            <div className="flex items-center space-x-1.5 text-sm font-semibold select-none justify-self-start">
              <span>{getSentimentIcon(sentiment)}</span>
              <span className={getSentimentTextColor(sentiment)}>
                {sentiment ? sentiment.charAt(0).toUpperCase() + sentiment.slice(1) : ""}
              </span>
            </div>
          </>
        )}

        {/* Scoped Brand */}
        {brand_id && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Brand
            </span>
            <div className="flex items-center space-x-1.5 justify-self-start text-sm font-medium text-gray-900 min-w-0 max-w-full">
              <span className="truncate max-w-[120px]">
                {ticket.brand_name || "EcoStyle"}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(brand_id || "");
                  toast.success("Brand ID copied to clipboard!");
                }}
                title="Copy Brand ID"
                className="text-text-muted hover:text-primary p-0.5 hover:bg-surface/50 rounded transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Customer */}
        {customer_id && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Customer
            </span>
            <div className="flex items-center space-x-1.5 justify-self-start text-sm font-medium text-gray-900 min-w-0 max-w-full">
              <span className="truncate max-w-[120px]">
                {ticket.customer_name || `Customer #${customer_id?.slice(0, 8)}`}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(customer_id || "");
                  toast.success("Customer ID copied to clipboard!");
                }}
                title="Copy Customer ID"
                className="text-text-muted hover:text-primary p-0.5 hover:bg-surface/50 rounded transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Opened At */}
        {created_at && (
          <>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Opened At
            </span>
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900 justify-self-start">
              <span>{formatDate(created_at)}</span>
            </div>
          </>
        )}

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
              <div className="flex items-center justify-between w-full">
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-medium">
                  Unassigned
                </div>
                {!isAssignFormOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAssignFormOpen(true)}
                    className="h-8 text-[11px] px-3 border-primary/35 text-primary hover:bg-primary/5"
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
