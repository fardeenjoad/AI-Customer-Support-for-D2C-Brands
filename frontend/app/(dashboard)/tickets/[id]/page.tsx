"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Message, Ticket, useTickets } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SkeletonCard, SkeletonChatBubble } from "@/components/common/LoadingSkeleton";
import {
  cn,
  formatDate,
  formatRelativeTime,
  getPriorityColor,
  getSentimentColor,
  getStatusColor,
  truncateText,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCog,
  Zap,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

function statusLabel(status: string) {
  if (status === "in_progress") return "pending";
  return status?.replace("_", " ") || "open";
}

function priorityLabel(priority: string) {
  if (priority === "urgent") return "escalated";
  return priority || "low";
}

function customerInitial(customerId?: string) {
  return (customerId || "CU").slice(0, 2).toUpperCase();
}

function senderMeta(sender: Message["sender"]): { label: string; icon: IconType } {
  if (sender === "ai") return { label: "ResolveIQ AI", icon: Bot };
  if (sender === "agent") return { label: "Agent", icon: UserCog };
  return { label: "Customer", icon: User };
}

function buildAIDraft(ticket: Ticket, messages: Message[]) {
  const lastCustomerMessage = [...messages].reverse().find((message) => message.sender === "customer");
  const concern = lastCustomerMessage?.content
    ? truncateText(lastCustomerMessage.content, 110)
    : ticket.subject;

  if (ticket.priority === "urgent" || ticket.sentiment === "negative") {
    return `Thanks for flagging this. I reviewed the issue and I am prioritizing it with our support team now. We will confirm the next step on this thread and keep you updated until it is resolved.\n\nContext reviewed: ${concern}`;
  }

  if (ticket.status === "resolved") {
    return `Thanks for your patience. This has been marked resolved on our side. Please reply here if anything still looks off and we will reopen the case.`;
  }

  return `Thanks for reaching out. I checked the details and can help with this. I am reviewing the latest order and support context now, then I will share the next step here.\n\nContext reviewed: ${concern}`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/70 py-3 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function ConversationMessage({ message }: { message: Message }) {
  const meta = senderMeta(message.sender);
  const Icon = meta.icon;
  const isAI = message.sender === "ai";
  const isAgent = message.sender === "agent";

  return (
    <div className={cn("flex gap-3", isAgent && "justify-end")}>
      {!isAgent && (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            isAI
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border bg-slate-50 text-text-muted"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div className={cn("max-w-[82%]", isAgent && "ml-auto")}>
        <div className={cn("mb-1 flex items-center gap-2", isAgent && "justify-end")}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            {meta.label}
          </span>
          <span className="text-[11px] text-text-muted">
            {formatRelativeTime(message.created_at || message.timestamp || "")}
          </span>
        </div>
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm leading-6 text-text-primary",
            isAI && "border-primary/20 border-l-4 bg-primary/[0.04]",
            isAgent && "border-primary/20 bg-primary text-white",
            message.sender === "customer" && "border-border bg-white"
          )}
        >
          {isAI && (
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI generated
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>

      {isAgent && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <UserCog className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function TicketLoading() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <SkeletonCard />
      <div className="space-y-4">
        <SkeletonChatBubble />
        <SkeletonChatBubble className="ml-auto flex-row-reverse" />
        <SkeletonChatBubble />
      </div>
      <SkeletonCard />
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const {
    useTicketDetails,
    updateTicket,
    isUpdating,
    deleteTicket,
    sendAgentReply,
    isSendingReply,
  } = useTickets();
  const { assignAgent, isAssigning, useListAgents } = useAnalytics();

  const { data: detailRes, isLoading, refetch, isRefetching } = useTicketDetails(id);
  const { data: agentsRes } = useListAgents();

  const ticket = detailRes?.data?.ticket;
  const dbMessages = useMemo(() => detailRes?.data?.messages ?? [], [detailRes?.data?.messages]);
  const agents = useMemo(() => agentsRes?.data ?? [], [agentsRes?.data]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [agentId, setAgentId] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(dbMessages);
  }, [dbMessages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (ticket && !reply) {
      setReply(buildAIDraft(ticket, messages));
    }
  }, [messages, reply, ticket]);

  const timeline = useMemo(() => {
    if (!ticket) return [];

    const items: { label: string; detail: string; icon: IconType; tone: string }[] = [
      {
        label: "Created",
        detail: formatDate(ticket.created_at, "MMM dd, yyyy h:mm a"),
        icon: Calendar,
        tone: "text-primary",
      },
    ];

    if (messages.some((message) => message.sender === "ai")) {
      items.push({
        label: "AI response drafted",
        detail: "Conversation includes AI context",
        icon: Sparkles,
        tone: "text-primary",
      });
    }

    if (ticket.assigned_agent_id) {
      items.push({
        label: "Assigned",
        detail: ticket.assigned_agent_id.slice(0, 12),
        icon: UserCog,
        tone: "text-slate-600",
      });
    }

    if (ticket.status === "resolved") {
      items.push({
        label: "Resolved",
        detail: formatRelativeTime(ticket.updated_at),
        icon: CheckCircle2,
        tone: "text-emerald-700",
      });
    }

    return items;
  }, [messages, ticket]);

  const handleStatusChange = async (status: string) => {
    await updateTicket({ ticketId: id, status });
    refetch();
  };

  const handlePriorityChange = async (priority: string) => {
    await updateTicket({ ticketId: id, priority });
    refetch();
  };

  const handleAssign = async () => {
    if (!agentId.trim()) return;
    await assignAgent({ ticketId: id, agentId });
    setAgentId("");
    refetch();
  };

  const handleGenerateDraft = () => {
    if (!ticket) return;
    setReply(buildAIDraft(ticket, messages));
    replyRef.current?.focus();
  };

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    await sendAgentReply({
      ticketId: id,
      content: reply.trim(),
    });
    setReply("");
    toast.success("Reply sent.");
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this ticket?")) return;
    await deleteTicket(id);
    router.push("/tickets");
  };

  if (isLoading) {
    return <TicketLoading />;
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-border bg-white p-10 text-center shadow-sm">
        <MessageSquare className="mb-3 h-8 w-8 text-text-muted" />
        <h1 className="text-lg font-bold text-text-primary">Ticket not found</h1>
        <p className="mt-1 text-sm text-text-muted">
          This support thread is unavailable or was archived.
        </p>
        <Link href="/tickets" className="mt-5">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to queue
          </Button>
        </Link>
      </div>
    );
  }

  const displayedStatus = ticket.priority === "urgent" ? "escalated" : ticket.status;

  return (
    <motion.div
      className="space-y-5 pb-6 text-left"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="min-w-0">
          <Link
            href="/tickets"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to queue
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary">
            {ticket.subject || "Untitled support request"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-text-muted">
              #{ticket.id.slice(0, 8)}
            </span>
            <Badge className={getStatusColor(displayedStatus)}>
              {displayedStatus === "in_progress" ? "pending" : displayedStatus}
            </Badge>
            <Badge className={getPriorityColor(ticket.priority)}>
              {priorityLabel(ticket.priority)}
            </Badge>
            <Badge className={getSentimentColor(ticket.sentiment)}>
              {ticket.sentiment}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="danger" size="sm" onClick={handleArchive} className="h-9">
            <Trash2 className="h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]"
      >
        <aside className="space-y-5">
          <Card className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                {customerInitial(ticket.customer_id)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-text-primary">Customer</h2>
                <p className="truncate text-xs text-text-muted">
                  {ticket.customer_id.slice(0, 18)}
                </p>
              </div>
            </div>

            <InfoRow icon={Mail} label="Customer ID" value={ticket.customer_id} />
            <InfoRow icon={Tag} label="Brand ID" value={ticket.brand_id} />
            <InfoRow icon={Clock3} label="Created" value={formatDate(ticket.created_at, "MMM dd, yyyy")} />
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Ticket controls</h2>
              <p className="text-xs text-text-muted">Current routing and priority.</p>
            </div>

            <Select
              label="Status"
              value={ticket.status}
              disabled={isUpdating}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">Pending</option>
              <option value="resolved">Resolved</option>
            </Select>

            <Select
              label="Priority"
              value={ticket.priority}
              disabled={isUpdating}
              onChange={(event) => handlePriorityChange(event.target.value)}
            >
              <option value="urgent">Escalated</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>

            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Owner
              </p>
              <p className="mt-1 truncate text-sm font-medium text-text-primary">
                {ticket.assigned_agent_id || "Unassigned"}
              </p>
            </div>

            <div className="flex gap-2">
              <Select
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Select agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name || agent.email}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAssign}
                disabled={!agentId || isAssigning}
                className="h-9 shrink-0"
              >
                Assign
              </Button>
            </div>
          </Card>
        </aside>

        <Card className="flex min-h-[640px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Conversation</h2>
              <p className="text-xs text-text-muted">
                {messages.length} message{messages.length === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="outline">{statusLabel(ticket.status)}</Badge>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-5 py-5">
            {messages.length === 0 && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">No messages yet</p>
                <p className="mt-1 text-xs text-text-muted">
                  Replies will appear in this conversation thread.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <ConversationMessage key={message.id} message={message} />
            ))}
            <div ref={threadEndRef} />
          </div>
        </Card>

        <aside className="space-y-5">
          <Card className="border-primary/20 bg-primary/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">AI response</h2>
                  <p className="text-xs text-text-muted">Suggested agent reply.</p>
                </div>
              </div>
              <Badge className="border-primary/20 bg-white text-primary">AI</Badge>
            </div>

            <div className="mb-4 border-l-4 border-primary bg-white px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                <Zap className="h-3.5 w-3.5" />
                Draft
              </div>
              <textarea
                ref={replyRef}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={9}
                className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-text-primary outline-none placeholder:text-slate-400"
                placeholder="Generate or write a reply"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateDraft}
                className="h-9 flex-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSendReply}
                disabled={!reply.trim() || isSendingReply}
                isLoading={isSendingReply}
                className="h-9 flex-1"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text-primary">Timeline</h2>
                <p className="text-xs text-text-muted">Ticket activity markers.</p>
              </div>
              {ticket.priority === "urgent" && <AlertTriangle className="h-4 w-4 text-red-600" />}
            </div>
            <div className="space-y-4">
              {timeline.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={`${item.label}-${item.detail}`} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                      <Icon className={`h-4 w-4 ${item.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="truncate text-xs text-text-muted">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </aside>
      </motion.div>
    </motion.div>
  );
}
