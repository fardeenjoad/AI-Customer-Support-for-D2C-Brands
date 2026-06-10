"use client";

import { useEffect, useState } from "react";
import { useTickets, Message } from "@/hooks/useTickets";
import { TicketCard } from "@/components/tickets/TicketCard";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TicketDetail } from "@/components/tickets/TicketDetail";
import { SkeletonCard, SkeletonChatBubble } from "@/components/common/LoadingSkeleton";
import { Inbox, MessageSquarePlus } from "lucide-react";

export default function LiveChatPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const { useListTickets, useTicketDetails, updateTicket, isUpdating, uploadAttachment, sendAgentReply } = useTickets();
  
  const { data: ticketsRes, isLoading: isLoadingList, refetch: refetchList } = useListTickets(
    {
      limit: 100,
      status_filter: "open",
    },
    { refetchInterval: 3000 }
  );
  
  const activeTickets = ticketsRes?.data || [];

  const { data: detailRes, isLoading: isLoadingDetails, refetch: refetchDetails } = useTicketDetails(
    selectedTicketId || "",
    { refetchInterval: 3000 }
  );
  const selectedTicket = detailRes?.data?.ticket;
  const dbMessages = detailRes?.data?.messages;

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      setMessages(dbMessages);
    } else {
      setMessages([]);
    }
  }, [dbMessages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedTicketId) return;
    try {
      await sendAgentReply({ ticketId: selectedTicketId, content });
    } catch (error) {
      console.error("Failed to send agent reply", error);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!selectedTicketId) return;
    try {
      await uploadAttachment({ ticketId: selectedTicketId, file });
      refetchDetails();
    } catch (error) {
      console.error("File upload failed", error);
    }
  };

  const handleUpdateTicket = async (payload: { status?: string; priority?: string; assigned_agent_id?: string | null }) => {
    if (!selectedTicketId) return;
    try {
      await updateTicket({ ticketId: selectedTicketId, ...payload });
      refetchDetails();
      refetchList();
    } catch (error) {
      console.error("Failed to update ticket", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] border border-border/80 rounded-xl overflow-hidden bg-surface/5 text-left animate-fadeIn">
      {/* Panel 1 */}
      <div className="w-80 border-r border-border/80 bg-surface/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/80 bg-surface/10 select-none">
          <h3 className="text-sm font-semibold text-text-primary font-heading">
            Live Support Chats
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Active incoming conversations ({activeTickets.length})
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingList ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 rounded bg-border/40" />
              <div className="h-16 rounded bg-border/20" />
              <div className="h-16 rounded bg-border/20" />
            </div>
          ) : activeTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-text-muted h-64 space-y-2">
              <Inbox className="h-8 w-8 text-text-muted/60" />
              <span>All queues resolved!</span>
            </div>
          ) : (
            activeTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isActive={selectedTicketId === ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Panel 2 & 3 */}
      {selectedTicketId ? (
        <div className="flex flex-1 min-w-0 bg-background/10">
          <div className="flex-1 flex flex-col justify-between h-full bg-surface/5 border-r border-border/80">
            <div className="p-4 border-b border-border/80 flex items-center justify-between bg-surface/15 select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary font-heading truncate max-w-sm">
                  {selectedTicket?.subject || "Active Chat"}
                </span>
                <span className="text-[9px] text-text-muted font-mono mt-0.5">
                  ID: {selectedTicketId}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-background/20">
              {isLoadingDetails ? (
                <div className="space-y-4">
                  <SkeletonChatBubble />
                  <SkeletonChatBubble />
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))
              )}
            </div>

            <div className="p-4 border-t border-border/85 bg-surface/50 backdrop-blur-sm shrink-0">
              <ChatInput
                onSendMessage={handleSendMessage}
                onUploadFile={handleUploadFile}
                placeholder="Reply to live conversation..."
              />
            </div>
          </div>

          <div className="w-80 overflow-y-auto p-5 shrink-0 bg-surface/10 select-none">
            {selectedTicket ? (
              <TicketDetail
                ticket={selectedTicket}
                onUpdateTicket={handleUpdateTicket}
                isUpdating={isUpdating}
              />
            ) : (
              <SkeletonCard />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-background/10">
          <div className="w-12 h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted mb-4 shadow-sm">
            <MessageSquarePlus className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-text-primary font-heading">
            Live Support Workspace
          </h4>
          <p className="text-xs text-text-muted max-w-xs leading-relaxed mt-1">
            Select an active customer conversation from the left side list queue to start writing replies.
          </p>
        </div>
      )}
    </div>
  );
}
