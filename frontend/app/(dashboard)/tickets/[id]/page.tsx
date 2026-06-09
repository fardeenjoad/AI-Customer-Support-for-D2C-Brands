/* eslint-disable @next/next/no-img-element */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { useTickets, Message, Ticket } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPriorityColor,
  getStatusColor,
  getSentimentColor,
  formatDate,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import { SkeletonCard, SkeletonChatBubble } from "@/components/common/LoadingSkeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Send,
  Bot,
  User,
  UserCog,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  MessageSquare,
  ShieldAlert,
  Zap,
  Calendar,
  StickyNote,
  Plus,
  ChevronDown,
  Smile,
  Meh,
  Frown,
  Paperclip,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────
//  Constants & Helpers
// ────────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<string, { icon: typeof Smile; emoji: string; label: string }> = {
  positive: { icon: Smile, emoji: "😊", label: "Positive" },
  neutral: { icon: Meh, emoji: "😐", label: "Neutral" },
  negative: { icon: Frown, emoji: "😡", label: "Negative" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ────────────────────────────────────────────────────────────────
//  Chat Bubble (inline — premium redesign)
// ────────────────────────────────────────────────────────────────

function PremiumChatBubble({
  message,
  ticketSentiment,
}: {
  message: Message;
  ticketSentiment?: string;
}) {
  const { sender, content, created_at, timestamp } = message;
  const timeToFormat = created_at || timestamp;
  const senderType = sender?.toLowerCase() || "";
  const isCustomer = senderType === "customer";
  const isAI = senderType === "ai";
  const isOnRight = !isCustomer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex w-full items-end space-x-2.5 my-3",
        isOnRight && "justify-end"
      )}
    >
      {/* Avatar — only for non-customer (AI / agent) */}
      {!isCustomer && (
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-xs shadow-sm",
            isAI && "bg-accent/10 border-accent/30 text-accent shadow-glow-cyan",
            !isAI && "gradient-primary text-white border-0 shadow-glow"
          )}
        >
          {isAI ? <Bot className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[75%] space-y-1",
          isOnRight && "items-end"
        )}
      >
        {/* Metadata */}
        <div
          className={cn(
            "flex items-center space-x-1.5 text-[10px] text-text-muted px-1",
            isOnRight && "justify-end"
          )}
        >
          <span className="font-semibold uppercase tracking-wider">
            {isCustomer ? "Customer" : isAI ? "ResolveIQ AI" : "Agent"}
          </span>
          <span>·</span>
          <span>{formatRelativeTime(timeToFormat || "")}</span>
          {isCustomer && ticketSentiment && (
            <>
              <span>·</span>
              <span className="flex items-center space-x-0.5">
                <span>{SENTIMENT_CONFIG[ticketSentiment]?.emoji || "😐"}</span>
              </span>
            </>
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl border text-sm leading-relaxed break-words whitespace-pre-wrap transition-all",
            isCustomer && "bg-primary text-white rounded-bl-sm",
            isAI && "bg-surface border-border text-text-primary rounded-br-sm",
            !isCustomer && !isAI && "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/25 text-text-primary rounded-br-sm"
          )}
        >
          {isAI && (
            <div className="flex items-center space-x-1.5 text-[10px] text-accent font-bold uppercase tracking-wider mb-1.5">
              <Sparkles className="h-3 w-3" />
              <span>AI Support Assistant</span>
            </div>
          )}
          {(() => {
            const match = content.match(/^\[Attachment:\s*(.*?)\s*\((.*?)\)\](?:\n\n([\s\S]*))?$/);
            if (match) {
              const filename = match[1];
              const url = match[2];
              const caption = match[3];
              const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(filename) || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
              return (
                <div className="flex flex-col space-y-1.5">
                  {isImage ? (
                    <div className="flex flex-col space-y-1.5 mt-1 max-w-xs sm:max-w-sm rounded-lg overflow-hidden border border-black/10 bg-black/5">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={filename}
                          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                        />
                      </a>
                      <div className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 text-[10px] border-t border-black/10",
                        isCustomer ? "text-white/80" : "text-text-muted"
                      )}>
                        <span className="truncate max-w-[150px] font-semibold">{filename}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center space-x-0.5 font-bold">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span>View full</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center space-x-2 font-semibold border rounded-lg p-2.5 hover:underline text-xs bg-black/10 border-black/20",
                        isCustomer ? "text-white" : "text-primary"
                      )}
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[150px]">{filename}</span>
                    </a>
                  )}
                  {caption && <div className="text-xs pt-0.5 leading-relaxed">{caption}</div>}
                </div>
              );
            }
            return content;
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Typing Indicator
// ────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-end space-x-2.5 my-3"
    >
      <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="bg-surface/80 border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-1.5">
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Timeline Item
// ────────────────────────────────────────────────────────────────

function TimelineItem({
  icon: Icon,
  title,
  time,
  color = "text-text-muted",
}: {
  icon: typeof Clock;
  title: string;
  time: string;
  color?: string;
}) {
  return (
    <div className="flex items-start space-x-3 relative">
      {/* Vertical line connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-7 h-7 rounded-full border flex items-center justify-center shrink-0",
            color === "text-primary"
              ? "bg-primary/10 border-primary/30"
              : color === "text-accent"
              ? "bg-accent/10 border-accent/30"
              : color === "text-success"
              ? "bg-success/10 border-success/30"
              : color === "text-warning"
              ? "bg-warning/10 border-warning/30"
              : "bg-surface border-border"
          )}
        >
          <Icon className={cn("h-3 w-3", color)} />
        </div>
      </div>
      <div className="flex flex-col pb-4">
        <span className="text-xs text-text-primary font-medium leading-tight">
          {title}
        </span>
        <span className="text-[10px] text-text-muted mt-0.5">{time}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    useTicketDetails,
    updateTicket,
    isUpdating,
    deleteTicket,
    uploadAttachment,
    sendAgentReply,
  } = useTickets();
  const { assignAgent, isAssigning, useListAgents } = useAnalytics();
  const { data: agentsRes } = useListAgents();
  const agents = agentsRes?.data || [];
  const { addNotification } = useNotificationStore();

  const { data: detailRes, isLoading, refetch, isRefetching } =
    useTicketDetails(id);

  const ticket = detailRes?.data?.ticket;
  const dbMessages = detailRes?.data?.messages;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [agentInputId, setAgentInputId] = useState("");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [notes, setNotes] = useState<{ text: string; time: string }[]>([]);
  const [tags] = useState(["d2c", "support", "auto-classified"]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync messages from API
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      setMessages(dbMessages);
    }
  }, [dbMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Handlers ──

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      await sendAgentReply({
        ticketId: id,
        content: inputValue.trim(),
      });

      setInputValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      addNotification({
        title: "Reply Sent",
        message: `You replied to: "${ticket?.subject || id.slice(0, 8)}"`,
        type: "success",
        ticketId: id,
      });
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleAISuggest = async () => {
    setIsTyping(true);
    // Simulate AI thinking delay
    setTimeout(() => {
      const suggestions = [
        "Thank you for reaching out! I've reviewed your order and can confirm it's being processed. Let me escalate this to our fulfillment team for priority handling.",
        "I understand your concern. Based on our records, your refund has been initiated and should reflect in 3-5 business days. Is there anything else I can help with?",
        "I apologize for the inconvenience. I've flagged this issue with our technical team and you should see a resolution within 24 hours. We'll keep you updated via email.",
      ];
      const suggestion =
        suggestions[Math.floor(Math.random() * suggestions.length)];
      setInputValue(suggestion);
      setIsTyping(false);
      textareaRef.current?.focus();
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicket({ ticketId: id, status: newStatus });
      toast.success(`Status changed to ${newStatus.replace("_", " ")}`);
      refetch();
    } catch {
      /* handled in hook */
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await updateTicket({ ticketId: id, priority: newPriority });
      toast.success(`Priority changed to ${newPriority}`);
      refetch();
    } catch {
      /* handled in hook */
    }
  };

  const handleAgentAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentInputId.trim()) return;
    try {
      await assignAgent({ ticketId: id, agentId: agentInputId.trim() });
      setAgentInputId("");
      setShowAssignForm(false);
      refetch();
    } catch {
      /* handled */
    }
  };

  const handleDeleteTicket = async () => {
    if (confirm("Delete / archive this ticket?")) {
      try {
        await deleteTicket(id);
        router.push("/tickets");
      } catch {
        /* handled */
      }
    }
  };

  const handleAddNote = () => {
    if (!internalNote.trim()) return;
    setNotes((prev) => [
      { text: internalNote.trim(), time: new Date().toISOString() },
      ...prev,
    ]);
    setInternalNote("");
    toast.success("Internal note added.");
  };

  // ── Build timeline from messages ──
  const timeline = useMemo(() => {
    if (!ticket) return [];
    const items: { icon: typeof Clock; title: string; time: string; color: string }[] = [];

    items.push({
      icon: AlertCircle,
      title: "Ticket created",
      time: formatDate(ticket.created_at),
      color: "text-primary",
    });

    // Find first AI message
    const firstAI = messages.find((m) => m.sender === "ai");
    if (firstAI) {
      items.push({
        icon: Zap,
        title: "AI auto-response sent",
        time: formatDate(firstAI.created_at || firstAI.timestamp || ""),
        color: "text-accent",
      });
    }

    // If agent assigned
    if (ticket.assigned_agent_id) {
      items.push({
        icon: UserCog,
        title: "Agent assigned",
        time: formatRelativeTime(ticket.updated_at),
        color: "text-warning",
      });
    }

    // First agent message
    const firstAgent = messages.find((m) => m.sender === "agent");
    if (firstAgent) {
      items.push({
        icon: MessageSquare,
        title: "Agent first reply",
        time: formatDate(firstAgent.created_at || firstAgent.timestamp || ""),
        color: "text-success",
      });
    }

    // If resolved
    if (ticket.status === "resolved") {
      items.push({
        icon: CheckCircle2,
        title: "Ticket resolved",
        time: formatRelativeTime(ticket.updated_at),
        color: "text-success",
      });
    }

    return items;
  }, [ticket, messages]);

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-left">
        <div className="lg:col-span-3 space-y-4">
          <SkeletonCard />
          <SkeletonChatBubble />
          <SkeletonChatBubble />
          <SkeletonChatBubble />
        </div>
        <div className="lg:col-span-2">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-5">
          <AlertCircle className="h-8 w-8 text-text-muted" />
        </div>
        <h4 className="text-base font-bold text-text-primary mb-1 font-heading">
          Ticket not found
        </h4>
        <p className="text-xs text-text-muted mb-6 max-w-[250px]">
          This ticket does not exist or has been archived.
        </p>
        <Link href="/tickets">
          <Button variant="secondary">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const sentimentCfg = SENTIMENT_CONFIG[ticket.sentiment] || SENTIMENT_CONFIG.neutral;

  // ────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-5 text-left pb-6"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* ── Header Bar ── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4"
      >
        <div className="flex items-center space-x-4 min-w-0">
          <Link href="/tickets">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-text-muted hover:text-text-primary shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-heading text-text-primary tracking-tight truncate max-w-[400px]">
              {ticket.subject || "No Subject"}
            </h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] text-text-muted font-mono">
                #{id.slice(0, 12)}
              </span>
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace("_", " ")}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0 text-text-muted hover:text-text-primary"
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteTicket}
            className="h-8 px-3 text-[11px] flex items-center space-x-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">Archive</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Split Layout: 60/40 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* ════════════════════════════════════════════
            LEFT — Chat Interface (3/5 = 60%)
           ════════════════════════════════════════════ */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-3 flex flex-col h-[calc(100vh-220px)] min-h-[500px] border border-border/60 rounded-xl overflow-hidden bg-surface/10 relative"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none z-0" />

          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-surface/40 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Conversation
              </span>
              <span className="text-[10px] text-text-muted">
                ({messages.length} messages)
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-[10px] text-success font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 z-10 space-y-0.5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Bot className="h-10 w-10 text-text-muted mb-3 opacity-40" />
                <p className="text-xs text-text-muted">
                  No messages yet. Start the conversation.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <PremiumChatBubble
                key={msg.id}
                message={msg}
                ticketSentiment={
                  msg.sender === "customer" ? ticket.sentiment : undefined
                }
              />
            ))}
            <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-border/60 bg-surface/50 backdrop-blur-md z-10">
            <div className="border border-border bg-surface/80 rounded-xl p-3 shadow-lg">
              {/* Action buttons above input */}
              <div className="flex items-center space-x-2 mb-2">
                <button
                  type="button"
                  onClick={handleAISuggest}
                  disabled={isTyping}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI Suggest</span>
                </button>
              </div>
              {/* Textarea + Send */}
              <div className="flex items-end space-x-3">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 resize-none text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-0 max-h-[120px] py-2 outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="h-9 px-4 flex items-center space-x-1.5 shrink-0 shadow-glow"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════
            RIGHT — Info Panel (2/5 = 40%)
           ════════════════════════════════════════════ */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-2 space-y-4 h-[calc(100vh-220px)] min-h-[500px] overflow-y-auto pr-1"
        >
          {/* ── Ticket Properties ── */}
          <Card className="!p-5 space-y-4">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              Ticket Properties
            </h3>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Status</span>
              <select
                value={ticket.status}
                disabled={isUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-surface border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">
                Priority
              </span>
              <select
                value={ticket.priority}
                disabled={isUpdating}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="bg-surface border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-text-primary cursor-pointer focus:outline-none focus:border-primary transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Sentiment */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">
                Sentiment
              </span>
              <motion.div
                key={ticket.sentiment}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getSentimentColor(ticket.sentiment)}`}
              >
                <span>{sentimentCfg.emoji}</span>
                <span className="capitalize">{ticket.sentiment}</span>
              </motion.div>
            </div>

            {/* Brand & Created */}
            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">
                  Brand ID
                </span>
                <span className="text-[10px] font-mono text-text-primary bg-surface border border-border/80 px-2 py-1 rounded-md truncate max-w-[140px]">
                  {ticket.brand_id.slice(0, 12)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">
                  Created
                </span>
                <span className="text-[11px] text-text-muted flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(ticket.created_at, "MMM dd, yyyy")}</span>
                </span>
              </div>
            </div>
          </Card>

          {/* ── Customer Info ── */}
          <Card className="!p-5 space-y-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              Customer
            </h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
                <User className="h-5 w-5 text-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary font-heading truncate">
                  Customer
                </p>
                <p className="text-[10px] text-text-muted font-mono truncate max-w-[160px]">
                  {ticket.customer_id.slice(0, 12)}...
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border/40">
              <span>Member since</span>
              <span className="text-text-primary font-medium">
                {formatDate(ticket.created_at, "MMM yyyy")}
              </span>
            </div>
          </Card>

          {/* ── Assigned Agent ── */}
          <Card className="!p-5 space-y-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              Assigned Agent
            </h3>
            {ticket.assigned_agent_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                    <UserCog className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary font-heading">
                      Agent
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">
                      {ticket.assigned_agent_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="text-[10px] text-text-muted hover:text-primary h-7"
                >
                  Reassign
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-warning/5 border border-warning/20 px-3 py-2.5 rounded-lg text-warning text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 animate-pulse" />
                  <span className="font-semibold">Unassigned</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssignForm(true)}
                  className="h-6 px-2 text-[10px] text-warning hover:text-text-primary hover:bg-warning/10"
                >
                  Assign
                </Button>
              </div>
            )}

            <AnimatePresence>
              {showAssignForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAgentAssignment}
                  className="flex flex-col space-y-2 mt-1 bg-background p-3 border border-border rounded-lg overflow-hidden"
                >
                  <label className="text-[9px] text-text-muted font-bold tracking-wider uppercase">
                    Select Agent
                  </label>
                  <div className="flex space-x-2">
                    <select
                      required
                      value={agentInputId}
                      onChange={(e) => setAgentInputId(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>-- Choose Agent --</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.full_name || agent.email.split("@")[0]} ({agent.email})
                        </option>
                      ))}
                    </select>
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
                    onClick={() => setShowAssignForm(false)}
                    className="h-6 self-end text-[10px] text-text-muted"
                  >
                    Cancel
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </Card>

          {/* ── Timeline ── */}
          <Card className="!p-5 space-y-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="h-3 w-3" />
              <span>Timeline</span>
            </h3>
            <div className="flex flex-col ml-0.5">
              {timeline.map((item, idx) => (
                <TimelineItem
                  key={idx}
                  icon={item.icon}
                  title={item.title}
                  time={item.time}
                  color={item.color}
                />
              ))}
              {timeline.length === 0 && (
                <p className="text-xs text-text-muted py-2">
                  No activity recorded.
                </p>
              )}
            </div>
          </Card>

          {/* ── Tags ── */}
          <Card className="!p-5 space-y-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <Tag className="h-3 w-3" />
              <span>Tags</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface border border-border text-text-muted hover:border-primary/40 hover:text-primary transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
              <button className="px-2 py-1 rounded-full text-[10px] font-semibold bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors flex items-center space-x-1">
                <Plus className="h-2.5 w-2.5" />
                <span>Add</span>
              </button>
            </div>
          </Card>

          {/* ── Internal Notes ── */}
          <Card className="!p-5 space-y-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <StickyNote className="h-3 w-3" />
              <span>Internal Notes</span>
            </h3>
            <p className="text-[10px] text-text-muted">
              Only visible to agents and admins.
            </p>

            {/* Note input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddNote}
                className="h-8 px-3 text-[11px]"
                disabled={!internalNote.trim()}
              >
                Add
              </Button>
            </div>

            {/* Notes list */}
            <AnimatePresence>
              {notes.map((note, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border border-border/60 rounded-lg p-3 text-xs text-text-primary"
                >
                  <p>{note.text}</p>
                  <span className="text-[10px] text-text-muted mt-1 block">
                    {formatRelativeTime(note.time)} ·{" "}
                    {user?.email || "Agent"}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {notes.length === 0 && (
              <p className="text-[10px] text-text-muted/60 italic py-1">
                No internal notes yet.
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
