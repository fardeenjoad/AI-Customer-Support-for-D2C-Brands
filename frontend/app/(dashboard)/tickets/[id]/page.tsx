"use client";
// ResolveIQ Workspace
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Message, Ticket, useTickets } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  getAIPriorityScore,
  getSLAInfo,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  FileCheck,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCog,
  X,
  Zap,
  Lock,
  Heart,
  Smile,
  Frown,
  Meh,
  ShieldAlert,
  Award,
  History,
  FileText,
  DollarSign,
  Briefcase,
  Copy,
  Eye,
  Check,
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
    return `Thanks for flagging this. I reviewed the details and I am prioritizing it with our team now. We will verify the status and get back to you immediately.\n\nContext reviewed: ${concern}`;
  }

  if (ticket.status === "resolved") {
    return `Thanks for your patience. This has been marked resolved. Let us know if we can help with anything else.`;
  }

  return `Thanks for reaching out. I checked the details and can help with this. I am reviewing the context now, and will share the next step here shortly.\n\nContext reviewed: ${concern}`;
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
    <div className="flex items-start gap-3 border-b border-border/70 py-2.5 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function ConversationMessage({ message }: { message: Message }) {
  const isAI = message.sender === "ai";
  const isAgent = message.sender === "agent";
  const isInternal = message.content.startsWith("[Internal Note] ");
  
  const cleanContent = isInternal ? message.content.replace("[Internal Note] ", "") : message.content;
  const meta = senderMeta(message.sender);
  const Icon = meta.icon;

  return (
    <div className={cn("flex gap-3", isAgent && "justify-end", isInternal && "justify-center w-full px-2")}>
      {!isAgent && !isInternal && (
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

      <div className={cn(isInternal ? "w-full" : "max-w-[82%]", isAgent && "ml-auto")}>
        {!isInternal && (
          <div className={cn("mb-1 flex items-center gap-2", isAgent && "justify-end")}>
            <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-text-muted">
              {meta.label}
            </span>
            <span className="text-[10px] text-text-muted">
              {formatRelativeTime(message.created_at || message.timestamp || "")}
            </span>
          </div>
        )}

        <div
          className={cn(
            "rounded-xl border px-3 py-1.5 text-xs text-text-primary",
            isAI && "border-primary/20 border-l-4 bg-primary/[0.03]",
            isAgent && "border-primary/20 bg-primary text-white",
            message.sender === "customer" && "border-border bg-white",
            isInternal && "bg-amber-50/70 border-amber-200 text-amber-950 border-l-4 border-l-amber-500 rounded-lg shadow-none"
          )}
        >
          {isAI && (
            <div className="mb-2 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.02em] text-primary">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              <span>AI Copilot Draft</span>
            </div>
          )}
          {isInternal && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.02em] text-amber-700">
              <Lock className="h-3 w-3 text-amber-600" />
              <span>Internal Note (Agents Only)</span>
            </div>
          )}
          {(() => {
            const match = cleanContent.match(/^\[Attachment:\s*(.*?)\s*\((.*?)\)\](?:\n\n([\s\S]*))?$/);
            if (match) {
              const filename = match[1];
              const url = match[2];
              const caption = match[3];
              const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(filename) || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
              return (
                <div className="flex flex-col space-y-2">
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
                        isAgent ? "text-white/85" : "text-text-muted"
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
                        "flex items-center space-x-2 font-semibold rounded-lg p-2.5 max-w-sm mt-1 hover:underline",
                        isAgent ? "bg-white/10 border border-white/20 text-white" : "bg-primary/10 border border-primary/20 text-primary"
                      )}
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[180px]">{filename}</span>
                    </a>
                  )}
                  {caption && <div className="text-xs pt-0.5 leading-relaxed">{caption}</div>}
                </div>
              );
            }
            return <p className="whitespace-pre-wrap break-words">{cleanContent}</p>;
          })()}
        </div>
      </div>

      {isAgent && !isInternal && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <UserCog className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function AIInsightCard({
  intent,
  sentiment,
  confidence,
  risk,
  action,
}: {
  intent: string;
  sentiment: string;
  confidence: number;
  risk: string;
  action: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.02] to-indigo-[0.02] p-3 text-left select-none"
    >
      <div className="flex items-center justify-between border-b border-primary/10 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-text-primary tracking-wide">
            ResolveIQ AI Insight
          </span>
        </div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[9px] font-medium font-mono">
          Confidence: {confidence}%
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs mb-3">
        <div className="bg-slate-50/70 border border-border/60 p-2 rounded-lg">
          <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Intent</span>
          <span className="font-semibold text-text-primary mt-0.5 block capitalize">{intent}</span>
        </div>
        <div className="bg-slate-50/70 border border-border/60 p-2 rounded-lg">
          <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Sentiment</span>
          <span className="font-semibold text-text-primary mt-0.5 block capitalize">{sentiment}</span>
        </div>
        <div className="bg-slate-50/70 border border-border/60 p-2 rounded-lg">
          <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Escalation Risk</span>
          <span className={cn("font-semibold mt-0.5 block capitalize", risk === "High" ? "text-red-600 font-semibold" : "text-text-primary")}>
            {risk}
          </span>
        </div>
        <div className="bg-slate-50/70 border border-border/60 p-2 rounded-lg">
          <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Recommended Action</span>
          <span className="font-semibold text-primary mt-0.5 block truncate">{action}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-muted bg-primary/[0.02] border border-primary/10 p-2 rounded-lg">
        <Zap className="h-3.5 w-3.5 text-primary animate-bounce shrink-0" />
        <span><strong className="text-text-primary">Rule trigger:</strong> {action} recommended. Use suggested action chips in the Copilot sidebar.</span>
      </div>
    </motion.div>
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
    uploadAttachment,
    isUploading,
  } = useTickets();
  const { assignAgent, isAssigning, useListAgents, useBrandDetail } = useAnalytics();

  const { data: detailRes, isLoading, refetch, isRefetching } = useTicketDetails(id);
  const ticket = detailRes?.data?.ticket;
  
  const { data: brandRes } = useBrandDetail(ticket?.brand_id || "");
  const brandDetail = brandRes?.data;
  
  const { data: agentsRes } = useListAgents(ticket?.brand_id);
  const dbMessages = useMemo(() => detailRes?.data?.messages ?? [], [detailRes?.data?.messages]);
  const agents = useMemo(() => agentsRes?.data ?? [], [agentsRes?.data]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Tab State for right panel
  const [activeRightTab, setActiveRightTab] = useState<"copilot" | "customer">("copilot");
  // Composer Tab: Public Reply vs Internal Note
  const [composerTab, setComposerTab] = useState<"public" | "internal">("public");
  // AI draft generating state (simulation)
  const [isAIDrafting, setIsAIDrafting] = useState(false);

  // SLA calculation ticking hook
  const [timeNow, setTimeNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTimeNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const slaInfo = useMemo(() => {
    if (!ticket) return { text: "No SLA", color: "text-text-muted bg-slate-50", progress: 100 };
    if (ticket.status === "resolved") return { text: "Resolved", color: "text-emerald-700 bg-emerald-50/60 border-emerald-200 border", progress: 100 };
    
    let hoursLimit = 48;
    if (ticket.priority === "urgent") hoursLimit = 4;
    else if (ticket.priority === "high") hoursLimit = 12;
    else if (ticket.priority === "medium") hoursLimit = 24;
    
    const createdTime = new Date(ticket.created_at).getTime();
    const limitTime = createdTime + hoursLimit * 60 * 60 * 1000;
    const diffMs = limitTime - timeNow;
    
    const totalSlaMs = hoursLimit * 60 * 60 * 1000;
    const progress = Math.max(0, Math.min(100, (diffMs / totalSlaMs) * 100));

    if (diffMs <= 0) {
      return { text: "SLA Overdue", color: "text-red-700 bg-red-50 border-red-200 border animate-pulse", progress: 0 };
    }
    
    const diffHrs = Math.floor(diffMs / (3600 * 1000));
    const diffMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    
    let text = "";
    if (diffHrs > 0) {
      text = `${diffHrs}h ${diffMins}m remaining`;
    } else {
      text = `${diffMins}m remaining`;
    }
    
    let color = "text-slate-600 bg-slate-50 border-slate-200 border";
    if (diffMs < 2 * 60 * 60 * 1000) {
      color = "text-amber-700 bg-amber-50 border-amber-200 border animate-pulse";
    }
    
    return { text: `SLA: ${text}`, color, progress };
  }, [ticket, timeNow]);

  const priorityScore = useMemo(() => {
    if (!ticket) return 50;
    return getAIPriorityScore(ticket.id, ticket.priority, ticket.sentiment);
  }, [ticket]);

  // Dynamic customer simulation values based on customer ID
  const customerInfo = useMemo(() => {
    if (!ticket) return null;
    const id = ticket.customer_id;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash += id.charCodeAt(i);
    }
    const names = ["Alex Rivera", "Jordan Croft", "Taylor Vance", "Morgan Finch", "Sam Ellis", "Jamie Vance", "Casey Morgan"];
    const name = names[hash % names.length];
    const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
    const ageMonths = (hash % 18) + 3;
    const ltv = (hash % 8) * 125 + 95;
    const totalTickets = (hash % 6) + 1;
    const rating = ((hash % 10) / 10 + 4.0).toFixed(1);

    const orders = [
      { id: `ORD-9${hash % 900 + 100}`, date: "2026-05-14", total: `$${(hash % 3 * 45 + 55).toFixed(2)}`, status: "Delivered", items: "Premium Zip-Up Hoodie (Black, L)" },
      { id: `ORD-8${hash % 900 + 100}`, date: "2026-03-22", total: `$${(hash % 2 * 35 + 35).toFixed(2)}`, status: "Delivered", items: "Classic Crew Socks (White, Pack of 3)" },
    ];
    if (hash % 3 === 0) {
      orders.push({ id: `ORD-7${hash % 900 + 100}`, date: "2026-01-10", total: `$${(hash % 4 * 20 + 25).toFixed(2)}`, status: "Delivered", items: "Organic Slouch Hat (Navy)" });
    }
    return { name, email, ageMonths, ltv, totalTickets, rating, orders };
  }, [ticket]);

  // Dynamic intent classification
  const computedIntent = useMemo(() => {
    if (!ticket) return { intent: "general", label: "General Query", conf: 85, risk: "Low", action: "Verify user accounts" };
    const sub = (ticket.subject || "").toLowerCase();
    const lastMsg = dbMessages.filter(m => m.sender === "customer").pop()?.content.toLowerCase() || "";
    const fullText = (sub + " " + lastMsg);
    
    if (fullText.includes("missing") || fullText.includes("lost") || fullText.includes("where is") || fullText.includes("haven't received") || fullText.includes("never got")) {
      return { intent: "missing_product", label: "Missing Product", conf: 94, risk: "High", action: "Verify shipment route" };
    }
    if (fullText.includes("refund") || fullText.includes("money back") || fullText.includes("cancel") || fullText.includes("charge")) {
      return { intent: "refund", label: "Refund Request", conf: 96, risk: "Medium", action: "Check returns policy" };
    }
    if (fullText.includes("shipment") || fullText.includes("delivery") || fullText.includes("shipped") || fullText.includes("tracking")) {
      return { intent: "delivery", label: "Delivery Issue", conf: 91, risk: "Medium", action: "Escalate to logistics" };
    }
    return { intent: "general", label: "General Query", conf: 82, risk: "Low", action: "Standard FAQ template" };
  }, [ticket, dbMessages]);

  useEffect(() => {
    setReply("");
    if (replyRef.current) {
      replyRef.current.style.height = "auto";
    }
  }, [id]);

  useEffect(() => {
    setMessages(dbMessages);
  }, [dbMessages]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStatusChange = async (status: string) => {
    await updateTicket({ ticketId: id, status });
    refetch();
  };

  const handlePriorityChange = async (priority: string) => {
    await updateTicket({ ticketId: id, priority });
    refetch();
  };

  const handleAgentChange = async (newAgentId: string) => {
    await assignAgent({ ticketId: id, agentId: newAgentId });
    toast.success(newAgentId ? "Ticket assignee updated." : "Ticket unassigned.");
    refetch();
  };

  // Simulated AI response writer
  const triggerAIDraft = (draftText: string) => {
    setIsAIDrafting(true);
    setTimeout(() => {
      setReply(draftText);
      setIsAIDrafting(false);
      toast.success("AI draft populated!");
      if (replyRef.current) {
        replyRef.current.focus();
        setTimeout(() => {
          if (replyRef.current) {
            replyRef.current.style.height = "auto";
            replyRef.current.style.height = `${Math.min(replyRef.current.scrollHeight, 150)}px`;
          }
        }, 50);
      }
    }, 1000);
  };

  const handleGenerateDraft = () => {
    if (!ticket) return;
    triggerAIDraft(buildAIDraft(ticket, messages));
  };

  const handleRewriteTone = (tone: string) => {
    if (!reply.trim()) {
      toast.error("Please draft a message first before rewriting.");
      return;
    }
    if (!ticket) return;
    let draft = reply.trim();
    if (tone === "professional") {
      draft = `Dear Customer,\n\nThank you for reaching out to us. I have investigated your request. ${draft.replace(/^Thanks.*?\./i, "")}\n\nPlease let us know if you have any further questions.\n\nSincerely,\nResolveIQ Support Team`;
    } else if (tone === "empathetic") {
      draft = `I completely understand how disappointing this must be, and I appreciate your patience. ${draft}\n\nWe will get this sorted out for you as quickly as possible.`;
    } else if (tone === "friendly") {
      draft = `Hi there! Thanks for writing in. ${draft}\n\nLet me know if there's anything else I can do to help! Have a great day!`;
    } else if (tone === "formal") {
      draft = `To whom it may concern,\n\nWe write in response to your ticket #${ticket.id.slice(0, 8)}. We are looking into the logistics details immediately. ${draft}\n\nBest regards,\nCustomer Relations Office`;
    } else if (tone === "short") {
      draft = `I am checking the order shipment details with our team now and will follow up shortly.`;
    } else if (tone === "detailed") {
      draft = `Thank you for contacting our support team. I have received your request regarding the missing product from your order. I am currently reviewing our warehouse dispatch records and checking with the logistics carrier to locate your package. I will follow up with you on this thread as soon as I receive an update from them. Thank you for your patience.`;
    }
    triggerAIDraft(draft);
  };

  const handleSendReply = async () => {
    let content = reply.trim();
    if (!content && !file) return;

    if (composerTab === "internal") {
      content = `[Internal Note] ${content}`;
    }

    try {
      if (file) {
        await uploadAttachment({
          ticketId: id,
          file,
          caption: content || undefined,
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        await sendAgentReply({
          ticketId: id,
          content,
        });
        toast.success(composerTab === "internal" ? "Internal note saved." : "Reply sent.");
      }
      setReply("");
      if (replyRef.current) {
        replyRef.current.style.height = "auto";
      }
      refetch();
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this ticket?")) return;
    await deleteTicket(id);
    router.push("/tickets");
  };

  const sentimentIcon = useMemo(() => {
    if (!ticket) return { icon: Meh, text: "Neutral", color: "text-slate-600 bg-slate-50 border-slate-200" };
    switch (ticket.sentiment) {
      case "positive":
        return { icon: Smile, text: "Positive Sentiment", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      case "negative":
        return { icon: Frown, text: "Negative Sentiment", color: "text-red-700 bg-red-50 border-red-200 animate-pulse" };
      case "neutral":
      default:
        return { icon: Meh, text: "Neutral Sentiment", color: "text-slate-600 bg-slate-50 border-slate-200" };
    }
  }, [ticket]);

  const SentimentIconComp = sentimentIcon.icon;

  if (isLoading) {
    return <TicketLoading />;
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-border bg-white p-10 text-center">
        <MessageSquare className="mb-3 h-8 w-8 text-text-muted" />
        <h1 className="text-lg font-semibold text-text-primary">Ticket not found</h1>
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
      className="-m-4 sm:-m-6 flex flex-col flex-1 min-h-0 text-left bg-background p-2 sm:p-3 space-y-2"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
    >
      {/* 1. Header Area */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between bg-white border border-border py-1.5 px-3 rounded-lg shrink-0"
      >
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5 select-none">
          <Link
            href="/tickets"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:text-text-primary hover:bg-slate-50 transition-colors"
            title="Back to operations"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <h1 className="text-sm font-semibold tracking-[-0.01em] text-text-primary truncate max-w-[180px] sm:max-w-xs mr-1">
            {ticket.subject || "Untitled support request"}
          </h1>
          <span className="shrink-0 text-[9px] font-medium font-mono px-1.5 py-0.5 rounded-full border border-border bg-slate-50 text-text-muted mr-1.5">
            #{ticket.id.slice(0, 8)}
          </span>
          
          {/* AI Escalated badge */}
          {(ticket.priority === "urgent" || priorityScore >= 90) && (
            <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] px-1.5 py-0 font-semibold flex items-center gap-0.5 animate-pulse">
              <Sparkles className="h-2.5 w-2.5" />
              AI Escalated
            </Badge>
          )}

          {/* SLA countdown badge */}
          {ticket.status !== "resolved" ? (
            <span className={cn("relative overflow-hidden inline-flex items-center gap-1 px-2.5 pt-1 pb-1.5 rounded-full text-[10px] font-semibold border", slaInfo.color)}>
              <Clock className="h-3 w-3" />
              <span>{slaInfo.text.replace("SLA: ", "")}</span>
              {/* SLA Countdown Progress line inside the badge */}
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-200/50">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    slaInfo.progress < 25 ? "bg-red-500" : slaInfo.progress < 50 ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${slaInfo.progress}%` }}
                />
              </div>
            </span>
          ) : (
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border", slaInfo.color)}>
              <Clock className="h-3 w-3" />
              <span>{slaInfo.text.replace("SLA: ", "")}</span>
            </span>
          )}

          {/* CSAT Display (only when resolved) */}
          {ticket.status === "resolved" && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-[9px] px-1.5 py-0 font-semibold">
              CSAT: 5.0
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 self-end lg:self-start shrink-0 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 py-1"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="danger" size="sm" onClick={handleArchive} className="h-8 py-1">
            <Trash2 className="h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      </motion.div>

      {/* 2. Content columns */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px] flex-1 min-h-0 overflow-hidden"
      >
        {/* LEFT COLUMN: CONVERSATION PANEL */}
        <Card className="flex flex-col h-full min-h-0 p-0 overflow-hidden border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5 select-none shrink-0">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary">Conversation ({messages.length})</h2>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono border-slate-300 py-0 px-1">
              {statusLabel(ticket.status)}
            </Badge>
          </div>

          {/* Messages scroll content */}
          <div ref={scrollContainerRef} className="flex-1 min-h-0 space-y-2 overflow-y-auto bg-slate-50/50 px-4 py-3">
            {messages.length === 0 && (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-text-muted/60" />
                <p className="text-sm font-semibold text-text-primary">No messages yet</p>
                <p className="mt-1 text-xs text-text-muted">
                  Replies will appear in this conversation thread.
                </p>
              </div>
            )}

            {messages.map((message, idx) => {
              const elements = [];
              // Inject AI Insight Card after the first message, simulating live analysis
              if (idx === 0) {
                elements.push(
                  <AIInsightCard
                    key="ai-insight-card"
                    intent={computedIntent.label}
                    sentiment={sentimentIcon.text.split(" ")[0]}
                    confidence={computedIntent.conf}
                    risk={computedIntent.risk}
                    action={computedIntent.action}
                  />
                );
              }
              elements.push(<ConversationMessage key={message.id} message={message} />);
              return elements;
            })}

            {/* Simulated AI drafting loader */}
            {isAIDrafting && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[82%]">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-text-muted">ResolveIQ AI</span>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  </div>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-3 text-xs text-text-muted italic flex items-center gap-2">
                    <span>ResolveIQ is analyzing metrics and composing draft replies...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Reply Composer */}
          <div className="border-t border-border bg-white p-3 shrink-0">
            {/* File attachment preview */}
            {file && (
              <div className="flex items-center justify-between bg-slate-50 border border-border rounded-lg p-2.5 mb-2.5 max-w-sm animate-fadeIn text-xs text-text-primary">
                <div className="flex items-center space-x-2">
                  <FileCheck className="h-4 w-4 text-primary animate-pulse shrink-0" />
                  <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                  <span className="text-[10px] text-text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Composer Box */}
            <div className="flex flex-col rounded-xl border border-border overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
              
              {/* Tab toggler: Public vs Internal */}
              <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-slate-50/50 select-none">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setComposerTab("public")}
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold border-b-2 transition-all",
                      composerTab === "public"
                        ? "border-primary text-primary"
                        : "border-transparent text-text-muted hover:text-text-primary"
                    )}
                  >
                    Public Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerTab("internal")}
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold border-b-2 transition-all flex items-center gap-1",
                      composerTab === "internal"
                        ? "border-amber-500 text-amber-700"
                        : "border-transparent text-text-muted hover:text-text-primary"
                    )}
                  >
                    <Lock className="h-2.5 w-2.5" />
                    Internal Note
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                     setFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                accept="image/*,application/pdf"
              />

              {/* Text Area */}
              <textarea
                ref={replyRef}
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 100)}px`;
                }}
                rows={1}
                className={cn(
                  "w-full px-3 py-2 resize-none border-0 bg-transparent text-xs leading-relaxed text-text-primary outline-none placeholder:text-text-muted max-h-[100px]",
                  composerTab === "internal" && "bg-amber-50/10"
                )}
                placeholder={composerTab === "internal" ? "Write an internal team note (not visible to customer)..." : "Type your reply to customer..."}
              />
              
              {/* Bottom Unified Toolbar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/50 border-t border-border select-none">
                <div className="flex items-center gap-2">
                  {/* File Attachment Action */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-slate-200 transition-colors"
                    title="Attach File (Image/PDF)"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>

                  {/* Tone Dropdown Selector */}
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        handleRewriteTone(e.target.value);
                        e.target.value = ""; // Reset select focus
                      }}
                      defaultValue=""
                      className="text-[10px] font-semibold pl-2 pr-6 py-1 rounded-md border border-border bg-white text-text-muted hover:border-primary/45 hover:text-primary transition-colors cursor-pointer outline-none appearance-none"
                    >
                      <option value="" disabled>Adjust Tone</option>
                      <option value="professional">Professional</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="short">Short</option>
                      <option value="detailed">Detailed</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* AI Draft Trigger */}
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={isAIDrafting}
                    className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:bg-primary/5 px-2.5 py-1 rounded-md border border-primary/20 transition-all"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Draft with AI</span>
                  </button>
                </div>

                {/* Send / Save Button */}
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={(!reply.trim() && !file) || isSendingReply || isUploading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold text-white transition-all shrink-0",
                    composerTab === "internal" 
                      ? "bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300"
                      : "bg-primary hover:bg-primary/95 disabled:bg-primary/50"
                  )}
                >
                  <Send className="h-3 w-3" />
                  <span>{composerTab === "internal" ? "Save Note" : "Send Reply"}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT COLUMN: SIDEBAR */}
        <aside className="flex flex-col h-full min-h-0 bg-white border border-border rounded-xl overflow-hidden select-none">
          {/* Right sidebar tab selector */}
          <div className="flex border-b border-border bg-slate-50 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setActiveRightTab("copilot")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border-b-2 transition-all",
                activeRightTab === "copilot"
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Copilot
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab("customer")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border-b-2 transition-all",
                activeRightTab === "customer"
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <User className="h-3.5 w-3.5" />
              Customer profile
            </button>
          </div>

          {/* Right sidebar tab content container */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
            <AnimatePresence mode="wait">
              {activeRightTab === "copilot" ? (
                <motion.div
                  key="copilot-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 text-left"
                >
                  {/* AI Summary Section */}
                  <div className="space-y-2 border-b border-border/60 pb-3">
                    <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      AI Summary
                    </h3>
                    <div className="bg-slate-50 border border-border/70 p-3 rounded-xl space-y-2">
                      <p className="text-xs text-text-primary font-medium leading-relaxed">
                        The customer reports a {computedIntent.label.toLowerCase()} issue. They are expressing frustration and require assistance.
                      </p>
                      <ul className="text-[11px] text-text-muted space-y-1 list-disc pl-4">
                        <li>Detected Intent: {computedIntent.label}</li>
                        <li>Escalation Level: {computedIntent.risk}</li>
                        <li>Requires: Urgent updates or replacement steps</li>
                      </ul>
                    </div>
                  </div>

                  {/* Intent & Confidence Section */}
                  <div className="space-y-2 border-b border-border/60 pb-3">
                    <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Intent Detection
                    </h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-text-muted uppercase">Detected</span>
                        <span className="text-xs font-semibold text-primary">{computedIntent.label}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${computedIntent.conf}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant={computedIntent.intent === "missing_product" ? "default" : "outline"} className="text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          Missing Product
                        </Badge>
                        <Badge variant={computedIntent.intent === "refund" ? "default" : "outline"} className="text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          Refund Request
                        </Badge>
                        <Badge variant={computedIntent.intent === "delivery" ? "default" : "outline"} className="text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          Delivery Issue
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Analysis Gauge */}
                  <div className="space-y-2 border-b border-border/60 pb-3">
                    <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-primary" />
                      Sentiment analysis
                    </h3>
                    <div className="bg-slate-50 border border-border/70 p-3 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-text-primary">Live sentiment:</span>
                        <span className={cn("font-semibold capitalize", ticket.sentiment === "negative" ? "text-red-600" : "text-emerald-600")}>
                          {ticket.sentiment}
                        </span>
                      </div>
                      {/* Sentiment Meter */}
                      <div className="relative w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ticket.sentiment === "negative" ? "bg-red-500" : ticket.sentiment === "positive" ? "bg-emerald-500" : "bg-slate-400"
                          )}
                          style={{
                            width: ticket.sentiment === "negative" ? "85%" : ticket.sentiment === "positive" ? "15%" : "50%",
                            marginLeft: ticket.sentiment === "positive" ? "85%" : ticket.sentiment === "negative" ? "0%" : "25%"
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-text-muted font-medium uppercase tracking-[0.02em]">
                        <span>Negative</span>
                        <span>Neutral</span>
                        <span>Positive</span>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Action Buttons */}
                  <div className="space-y-2 border-b border-border/60 pb-3">
                    <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Suggested Actions
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerAIDraft("I have double-checked the package shipment details with our team. The delivery status is being verified, and I will share the tracking update with you immediately.")}
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-border bg-slate-50 hover:border-primary/45 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none text-left"
                      >
                        <Zap className="h-2.5 w-2.5 text-primary" />
                        Verify Shipment
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerAIDraft("I'm sorry for this issue. We can send a replacement package right away. Please confirm your delivery address so we can register the shipment.")}
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-border bg-slate-50 hover:border-primary/45 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none text-left"
                      >
                        <Zap className="h-2.5 w-2.5 text-primary" />
                        Offer Replacement
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateTicket({ ticketId: id, priority: "urgent" });
                          toast.success("Ticket escalated to logistics team.");
                          refetch();
                        }}
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-border bg-slate-50 hover:border-primary/45 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none text-left"
                      >
                        <Zap className="h-2.5 w-2.5 text-primary" />
                        Escalate Priority
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerAIDraft("I have processed a full refund for this transaction. You will see the credit back on your original payment method within 3-5 business days.")}
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-border bg-slate-50 hover:border-primary/45 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none text-left"
                      >
                        <Zap className="h-2.5 w-2.5 text-primary" />
                        Issue Refund
                      </button>
                    </div>
                  </div>

                  {/* Knowledge Base Matches */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      KB Matches & Templates
                    </h3>
                    <div className="space-y-2">
                      {brandDetail?.faqs && brandDetail.faqs.length > 0 ? (
                        brandDetail.faqs.slice(0, 2).map((faq, index) => (
                          <div key={index} className="bg-slate-50 border border-border/80 p-2.5 rounded-xl text-xs space-y-1.5 hover:border-primary/20 transition-all">
                            <span className="font-semibold text-text-primary block truncate">{faq.question}</span>
                            <p className="text-[11px] text-text-muted line-clamp-2">{faq.answer}</p>
                            <button
                              type="button"
                              onClick={() => triggerAIDraft(faq.answer)}
                              className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline pt-1"
                            >
                              <Copy className="h-3 w-3" />
                              Use FAQ Answer
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-text-muted italic bg-slate-50 p-3 rounded-xl text-center">
                          No specific FAQ matches loaded.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="customer-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 text-left"
                >
                  {/* Customer Profile Header */}
                  {customerInfo && (
                    <>
                      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-base font-semibold text-primary shrink-0">
                          {customerInitial(ticket.customer_id)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-text-primary">{customerInfo.name}</h4>
                          <span className="truncate text-[10px] text-text-muted block">{customerInfo.email}</span>
                          <span className="text-[9px] text-primary font-medium uppercase tracking-[0.02em] block mt-0.5">
                            CSAT: {customerInfo.rating}/5.0 avg
                          </span>
                        </div>
                      </div>

                      {/* Customer metrics grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50/70 border border-border/60 p-2.5 rounded-xl flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">LTV</span>
                            <span className="font-semibold text-text-primary mt-0.5 block">${customerInfo.ltv.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/70 border border-border/60 p-2.5 rounded-xl flex items-center gap-2">
                          <History className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Age</span>
                            <span className="font-semibold text-text-primary mt-0.5 block">{customerInfo.ageMonths} months</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/70 border border-border/60 p-2.5 rounded-xl flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Total Tickets</span>
                            <span className="font-semibold text-text-primary mt-0.5 block">{customerInfo.totalTickets} threads</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/70 border border-border/60 p-2.5 rounded-xl flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.02em] block">Customer ID</span>
                            <span className="font-mono text-[9px] font-semibold text-text-primary mt-0.5 block truncate max-w-[80px]" title={ticket.customer_id}>
                              {ticket.customer_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order History */}
                      <div className="space-y-2 pt-2">
                        <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-text-primary flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-primary" />
                          Recent Orders
                        </h3>
                        <div className="space-y-2">
                          {customerInfo.orders.map((order, index) => (
                            <div key={order.id} className="bg-slate-50 border border-border/80 p-2.5 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-text-primary font-mono">{order.id}</span>
                                <Badge variant="outline" className="text-[9px] font-semibold px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-text-muted truncate">{order.items}</p>
                              <div className="flex justify-between items-center text-[10px] text-text-muted pt-1">
                                <span>{order.date}</span>
                                <span className="font-semibold text-text-primary">{order.total}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Static controls row (Routing assignments) */}
          <div className="border-t border-border bg-slate-50 p-2.5 space-y-1.5 shrink-0 text-left select-none">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.02em] text-text-muted">
              Routing & Assignment
            </h3>
            
            <div className="space-y-1 text-xs">
              {/* Status Row */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-0">
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-[0.02em] w-20">
                  Status
                </span>
                <div className="relative flex-1 max-w-[150px]">
                  <select
                    value={ticket.status}
                    disabled={isUpdating}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    className="w-full text-xs font-semibold bg-transparent border-0 hover:bg-slate-200/50 rounded px-1.5 py-1 text-text-primary outline-none appearance-none cursor-pointer text-right pr-4"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Priority Row */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-0">
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-[0.02em] w-20">
                  Priority
                </span>
                <div className="relative flex-1 max-w-[150px]">
                  <select
                    value={ticket.priority}
                    disabled={isUpdating}
                    onChange={(event) => handlePriorityChange(event.target.value)}
                    className="w-full text-xs font-semibold bg-transparent border-0 hover:bg-slate-200/50 rounded px-1.5 py-1 text-text-primary outline-none appearance-none cursor-pointer text-right pr-4"
                  >
                    <option value="urgent">Escalated</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Assignee Row */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-0">
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-[0.02em] w-20">
                  Assignee
                </span>
                <div className="relative flex-1 max-w-[150px]">
                  <select
                    value={ticket.assigned_agent_id || ""}
                    disabled={isAssigning}
                    onChange={(event) => handleAgentChange(event.target.value)}
                    className="w-full text-xs font-semibold bg-transparent border-0 hover:bg-slate-200/50 rounded px-1.5 py-1 text-text-primary outline-none appearance-none cursor-pointer text-right pr-4"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.full_name || agent.email}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </motion.div>
    </motion.div>
  );
}

function TicketLoading() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px] h-full min-h-[420px]">
      <div className="space-y-4">
        <SkeletonCard className="h-20" />
        <SkeletonChatBubble />
        <SkeletonChatBubble className="ml-auto flex-row-reverse" />
        <SkeletonChatBubble />
      </div>
      <SkeletonCard className="h-[420px]" />
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      {children}
    </div>
  );
}
