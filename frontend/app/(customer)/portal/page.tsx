"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonCard, SkeletonChatBubble } from "@/components/common/LoadingSkeleton";
import { getStatusColor, getPriorityColor, getSentimentColor, formatRelativeTime, cn } from "@/lib/utils";
import {
  Inbox,
  Plus,
  MessageSquare,
  Terminal,
  Calendar,
  ArrowLeft,
  Send,
  Star,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Ticket interface locally declared for the portal context
interface PortalTicket {
  id: string;
  customer_id: string;
  brand_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high" | "urgent";
  sentiment: "positive" | "neutral" | "negative";
  assigned_agent_id?: string | null;
  rating?: number | null;
  feedback_comment?: string | null;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
}

interface PortalMessage {
  id: string;
  ticket_id: string;
  sender: "customer" | "agent" | "ai";
  content: string;
  timestamp: string;
}

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0c10] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CustomerPortalContent />
    </Suspense>
  );
}

function CustomerPortalContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { logout, isAuthenticated } = useAuthStore();
  
  // Scopes brand from URL param, defaults to EcoStyle
  const brandId = searchParams.get("brand_id") || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  
  const { useBrandDetail } = useAnalytics();
  const { data: brandRes } = useBrandDetail(brandId);
  const brand = brandRes?.data;

  // Visual Custom Themes (White/Light Mode by default)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Portal States
  const [emailInput, setEmailInput] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // New ticket state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");

  // Feedback states
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [commentVal, setCommentVal] = useState("");

  // Reply state
  const [replyText, setReplyText] = useState("");

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);

  // ────────────────────────────────────────────────────────────────
  //  React Query APIs
  // ────────────────────────────────────────────────────────────────

  // 1. Passwordless Lookup
  const {
    data: ticketsList = [],
    isLoading: isSearching,
    refetch: performLookup,
    isFetched: hasLookedUp,
  } = useQuery<PortalTicket[]>({
    queryKey: ["portal-lookup", searchEmail],
    queryFn: async () => {
      const res = await api.get(`/tickets/portal/lookup?email=${encodeURIComponent(searchEmail)}`);
      return res.data?.data || [];
    },
    enabled: !!searchEmail,
    // No polling — refetch only on user action
    refetchInterval: false,
  });

  // 2. Ticket detail + history — NO automatic polling
  // Refreshes only when: user sends a reply, or clicks the manual refresh button
  const {
    data: detailData,
    isLoading: isLoadingDetails,
    isFetching: isFetchingDetails,
    refetch: refetchDetails,
  } = useQuery<{ ticket: PortalTicket; messages: PortalMessage[] }>({
    queryKey: ["portal-details", activeTicketId, searchEmail],
    queryFn: async () => {
      const res = await api.get(`/tickets/portal/${activeTicketId}?email=${encodeURIComponent(searchEmail)}`);
      return res.data?.data;
    },
    enabled: !!activeTicketId && !!searchEmail,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const activeTicket = detailData?.ticket;
  const messages = useMemo(() => detailData?.messages || [], [detailData?.messages]);

  // 3. Dynamic user profile initialization & ticket creation
  const createTicketMutation = useMutation({
    mutationFn: async (payload: { email: string; subject: string; initial_message: string; brand_id: string }) => {
      const res = await api.post("/tickets/portal/create", payload);
      return res.data?.data;
    },
    onSuccess: (newTicket) => {
      toast.success("Support ticket created!");
      setNewSubject("");
      setNewInitialMsg("");
      setIsNewTicketOpen(false);
      
      // Auto look up the email used to submit the ticket
      setSearchEmail(emailInput || searchEmail);
      queryClient.invalidateQueries({ queryKey: ["portal-lookup", emailInput || searchEmail] });
      setActiveTicketId(newTicket.id);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create ticket.");
    },
  });

  // 4. Send Message Reply
  const sendReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/tickets/portal/${activeTicketId}/reply`, {
        email: searchEmail,
        content,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      setReplyText("");
      refetchDetails();
      queryClient.invalidateQueries({ queryKey: ["portal-lookup", searchEmail] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit message.");
    },
  });

  // 5. Submit Rating / Feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      const res = await api.post(`/tickets/portal/${activeTicketId}/feedback`, {
        email: searchEmail,
        ...payload,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success("Feedback submitted! Thank you.");
      setCommentVal("");
      refetchDetails();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit feedback.");
    },
  });

  // Scroll to chat bottom
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSearchEmail(emailInput.trim());
  };

  // Create Ticket Form Submit
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim() || !emailInput.trim()) {
      toast.error("All fields are required to submit.");
      return;
    }
    createTicketMutation.mutate({
      email: emailInput.trim(),
      subject: newSubject.trim(),
      initial_message: newInitialMsg.trim(),
      brand_id: brandId,
    });
  };

  // Submit Feedback Rating
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedbackMutation.mutate({
      rating: ratingVal,
      comment: commentVal,
    });
  };

  // Submit Reply Message
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    sendReplyMutation.mutate(replyText.trim());
  };

  // Determine portal brand configuration name
  const brandDisplayName = brand?.brand_name || "D2C Brand Store";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300 flex flex-col justify-between font-sans",
        isDarkMode ? "bg-[#0b0c10] text-[#f1f5f9]" : "bg-[#f8fafc] text-[#0f172a]"
      )}
    >
      {/* ────────────────────────────────────────────────────────────────
          PORTAL HEADER
         ──────────────────────────────────────────────────────────────── */}
      <header
        className={cn(
          "h-16 border-b flex items-center justify-between px-6 md:px-12 backdrop-blur-md sticky top-0 z-40 select-none",
          isDarkMode
            ? "border-[#1e293b]/50 bg-[#0f172a]/70"
            : "border-slate-200 bg-white/70"
        )}
      >
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
              isDarkMode
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-indigo-50 text-indigo-600 border-indigo-100"
            )}
          >
            <Terminal className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm tracking-wider uppercase">
              RESOLVE<span className="text-indigo-500">IQ</span>
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-widest -mt-0.5",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}
            >
              {brandDisplayName} Customer Support Portal
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {searchEmail && (
            <button
              onClick={() => {
                setSearchEmail("");
                setEmailInput("");
                setActiveTicketId(null);
              }}
              className={cn(
                "text-xs font-semibold flex items-center space-x-1.5 transition-colors px-3 py-1.5 rounded-lg border",
                isDarkMode
                  ? "bg-[#1e293b] text-slate-300 border-slate-800 hover:text-white"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Change Email</span>
            </button>
          )}

          {/* LIGHT / DARK THEME TOGGLE */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-2 rounded-lg border transition-all duration-200 flex items-center justify-center",
              isDarkMode
                ? "bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-800"
                : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50"
            )}
            title={isDarkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* LOGOUT BUTTON */}
          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className={cn(
                "text-xs font-semibold flex items-center space-x-1.5 transition-colors px-3 py-1.5 rounded-lg border",
                isDarkMode
                  ? "bg-slate-800/80 text-rose-400 border-slate-700 hover:text-rose-300"
                  : "bg-white text-rose-600 border-slate-200 hover:bg-rose-50"
              )}
              title="Log Out"
            >
              <span>Log Out</span>
            </button>
          )}
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────
          MAIN WORKSPACE
         ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STEP 1: EMAIL LOOKUP CARD */}
          {!searchEmail ? (
            <motion.div
              key="lookup-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex items-center justify-center py-12"
            >
              <div
                className={cn(
                  "max-w-md w-full rounded-2xl border p-8 md:p-10 shadow-2xl relative overflow-hidden transition-all duration-300",
                  isDarkMode
                    ? "bg-[#131520] border-slate-800 shadow-indigo-950/20"
                    : "bg-white border-slate-200/80 shadow-slate-200/50"
                )}
              >
                {/* Decorative glow background for dark mode */}
                {isDarkMode && (
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
                )}

                <div className="text-center space-y-4 mb-8">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border",
                      isDarkMode
                        ? "bg-slate-800/60 border-slate-700 text-indigo-400"
                        : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    )}
                  >
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Track Support Tickets
                    </h2>
                    <p
                      className={cn(
                        "text-xs mt-1.5 leading-relaxed max-w-xs mx-auto",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      Enter the email address used to open your support inquiry. We will locate all
                      active sessions.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider pl-0.5",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. customer@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className={cn(
                        "flex h-11 w-full rounded-xl border px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                        isDarkMode
                          ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-indigo-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSearching}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/10"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Find My Tickets</span>
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span
                    className={cn(
                      "flex-shrink mx-4 text-[10px] uppercase font-bold tracking-widest",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(true)}
                  className={cn(
                    "w-full h-11 rounded-xl border font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors",
                    isDarkMode
                      ? "bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-indigo-400"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-indigo-600"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Open a New Ticket</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* STEP 2: LOOKUP RESULTS WORKSPACE */
            <motion.div
              key="portal-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col lg:flex-row border rounded-2xl overflow-hidden shadow-xl"
              style={{
                borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
                background: isDarkMode ? "#0e1017" : "#ffffff",
                height: "calc(100vh - 160px)",
              }}
            >
              {/* LEFT SIDEBAR: TICKETS LIST */}
              <div
                className={cn(
                  "w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r flex flex-col shrink-0",
                  isDarkMode ? "border-slate-800 bg-[#12141c]" : "border-slate-200 bg-slate-50/50"
                )}
              >
                {/* Email Display Banner */}
                <div
                  className={cn(
                    "p-4 border-b flex items-center justify-between shrink-0 select-none",
                    isDarkMode ? "border-slate-800/80" : "border-slate-200"
                  )}
                >
                  <div className="flex flex-col text-left">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      Tracking Tickets For
                    </span>
                    <span className="text-xs font-semibold truncate max-w-[200px]">
                      {searchEmail}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNewTicketOpen(true)}
                    className="h-8 px-2.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New</span>
                  </Button>
                </div>

                {/* Tickets list box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {ticketsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
                      <Inbox className="h-8 w-8 text-slate-400 opacity-60 animate-bounce" />
                      <div>
                        <h4 className="text-xs font-bold">No active tickets found</h4>
                        <p
                          className={cn(
                            "text-[10px] mt-1 max-w-[180px] mx-auto leading-normal",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}
                        >
                          There are no tickets registered under this email in our store.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsNewTicketOpen(true)}
                        className="text-[11px] h-8 rounded-lg mt-2"
                      >
                        Create One Now
                      </Button>
                    </div>
                  ) : (
                    ticketsList.map((t) => {
                      const isActive = activeTicketId === t.id;
                      return (
                        <motion.div
                          key={t.id}
                          layoutId={`card-${t.id}`}
                          onClick={() => setActiveTicketId(t.id)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={cn(
                            "p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none shadow-sm relative overflow-hidden",
                            isActive
                              ? isDarkMode
                                ? "bg-indigo-600/15 border-indigo-500/30 text-white"
                                : "bg-indigo-50 border-indigo-200 text-slate-900"
                              : isDarkMode
                              ? "bg-[#181a25] border-slate-800/60 hover:bg-[#1f2231] text-slate-300 hover:text-white"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {/* Left Accent Bar on Active */}
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />
                          )}

                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={cn(
                                "text-[9px] font-mono",
                                isActive
                                  ? isDarkMode
                                    ? "text-indigo-400"
                                    : "text-indigo-600 font-bold"
                                  : isDarkMode
                                  ? "text-slate-500"
                                  : "text-slate-400"
                              )}
                            >
                              #{t.id.slice(0, 8)}
                            </span>
                            <Badge
                              className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                                getStatusColor(t.status)
                              )}
                            >
                              {t.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <h4 className="text-xs font-bold truncate pr-2 tracking-tight">
                            {t.subject}
                          </h4>

                          {t.last_message_preview && (
                            <p
                              className={cn(
                                "text-[11px] truncate mt-1.5 opacity-80 font-normal leading-relaxed",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}
                            >
                              {t.last_message_preview}
                            </p>
                          )}

                          <div
                            className={cn(
                              "flex items-center justify-between mt-2 pt-2 border-t text-[9px] font-medium uppercase tracking-wider",
                              isDarkMode ? "border-slate-800/40" : "border-slate-100"
                            )}
                          >
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatRelativeTime(t.created_at)}</span>
                            </span>
                            {t.rating && (
                              <span className="flex items-center space-x-0.5 text-amber-500">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span>{t.rating}/5</span>
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT VIEWPORT: TICKET CHAT DETAIL */}
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-background/5 relative">
                {activeTicketId ? (
                  <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                    {/* Chat Logs Window */}
                    <div
                      className={cn(
                        "flex-1 flex flex-col justify-between h-full border-r",
                        isDarkMode ? "border-slate-800/70" : "border-slate-200"
                      )}
                    >
                      {/* Sub-header details */}
                      <div
                        className={cn(
                          "p-4 border-b select-none shrink-0 flex items-center justify-between",
                          isDarkMode ? "border-slate-800 bg-[#12141c]/50" : "border-slate-200 bg-white"
                        )}
                      >
                        <div className="text-left">
                          <h3 className="text-sm font-bold tracking-tight">
                            {activeTicket?.subject}
                          </h3>
                          <span
                            className={cn(
                              "text-[10px] font-mono mt-0.5 block",
                              isDarkMode ? "text-slate-500" : "text-slate-400"
                            )}
                          >
                            Ticket ID: {activeTicket?.id}
                          </span>
                        </div>

                        {/* Manual Refresh Button */}
                        <button
                          onClick={() => refetchDetails()}
                          disabled={isFetchingDetails}
                          title="Refresh messages"
                          className={cn(
                            "p-2 rounded-lg border transition-all duration-200 flex items-center justify-center",
                            isDarkMode
                              ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          )}
                        >
                          <RefreshCw
                            className={cn("h-3.5 w-3.5", isFetchingDetails && "animate-spin")}
                          />
                        </button>
                      </div>

                      {/* Chat Messages */}
                      <div
                        className={cn(
                          "flex-grow overflow-y-auto p-4 md:p-6 space-y-4",
                          isDarkMode ? "bg-slate-900/10" : "bg-slate-50/20"
                        )}
                      >
                        {isLoadingDetails ? (
                          <div className="space-y-4">
                            <SkeletonChatBubble />
                            <SkeletonChatBubble />
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isCustomer = msg.sender === "customer";
                            const isAI = msg.sender === "ai";
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={cn("flex w-full items-end space-x-2.5", {
                                  "justify-end": isCustomer,
                                  "justify-start": !isCustomer,
                                })}
                              >
                                {/* Bot Icon */}
                                {!isCustomer && (
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                                      isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-indigo-400"
                                        : "bg-indigo-50 border-indigo-100 text-indigo-600"
                                    )}
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </div>
                                )}

                                <div className="flex flex-col space-y-0.5">
                                  <div
                                    className={cn(
                                      "max-w-md px-4 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm rounded-2xl",
                                      isCustomer
                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                        : isDarkMode
                                        ? "bg-[#181a25] border border-slate-800/80 text-slate-200 rounded-bl-sm"
                                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                                    )}
                                  >
                                    {isAI && (
                                      <span className="flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        <span>AI Support Assistant</span>
                                      </span>
                                    )}
                                    {msg.content}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[9px] block text-right pr-1 select-none",
                                      isDarkMode ? "text-slate-500" : "text-slate-400"
                                    )}
                                  >
                                    {formatRelativeTime(msg.timestamp)}
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                        <div ref={messageEndRef} />
                      </div>

                      {/* Reply Textbox Input */}
                      {activeTicket?.status !== "resolved" ? (
                        <form
                          onSubmit={handleSendReply}
                          className={cn(
                            "p-4 border-t flex items-center space-x-3 shrink-0",
                            isDarkMode
                              ? "border-slate-800/80 bg-[#12141c]/50"
                              : "border-slate-200 bg-white"
                          )}
                        >
                          <input
                            type="text"
                            placeholder="Add a reply to this ticket..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            disabled={sendReplyMutation.isPending}
                            className={cn(
                              "flex-grow h-10 rounded-xl border px-3 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                              isDarkMode
                                ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-indigo-500"
                                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                            )}
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={!replyText.trim() || sendReplyMutation.isPending}
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center space-x-1 shadow-md shadow-indigo-600/10"
                          >
                            {sendReplyMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Send</span>
                              </>
                            )}
                          </Button>
                        </form>
                      ) : (
                        /* Informational Locked Banner when Resolved */
                        <div
                          className={cn(
                            "p-4 border-t text-center text-xs font-medium shrink-0",
                            isDarkMode
                              ? "bg-slate-900/40 border-slate-800 text-slate-400"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          )}
                        >
                          This support session is marked as resolved and is read-only.
                        </div>
                      )}
                    </div>

                    {/* RIGHT SIDEBAR: TICKET METRICS & FEEDBACK */}
                    <div
                      className={cn(
                        "w-full md:w-[280px] shrink-0 flex flex-col h-full",
                        isDarkMode ? "bg-[#12141c]/40" : "bg-slate-50/20"
                      )}
                    >
                      {/* Sidebar Header */}
                      <div
                        className={cn(
                          "p-4 border-b select-none shrink-0 flex items-center justify-between",
                          isDarkMode ? "border-slate-800 bg-[#12141c]/50" : "border-slate-200 bg-white"
                        )}
                      >
                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest py-1.5">
                          Ticket Metadata
                        </span>
                      </div>

                      {/* Scrollable Attributes */}
                      <div className="flex-grow overflow-y-auto p-5 space-y-6 text-left">
                        {activeTicket ? (
                          <div className="space-y-6 select-none">
                            {/* Ticket attributes card */}
                            <div
                              className={cn(
                                "rounded-xl border p-5 space-y-4.5 shadow-sm transition-all duration-300",
                                isDarkMode
                                  ? "bg-[#181a25]/70 border-slate-800/80 shadow-indigo-950/5"
                                  : "bg-white border-slate-200/80 shadow-slate-200/30"
                              )}
                            >
                              <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                                  <Inbox className="h-3.5 w-3.5" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  Support Details
                                </h4>
                              </div>

                              <div className="space-y-3.5">
                                {/* Ticket ID */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Ticket ID
                                  </span>
                                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                                    #{activeTicket.id.slice(0, 8)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Status
                                  </span>
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border shadow-sm",
                                      getStatusColor(activeTicket.status)
                                    )}
                                  >
                                    {activeTicket.status.replace("_", " ")}
                                  </Badge>
                                </div>

                                {/* Priority */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Priority
                                  </span>
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border shadow-sm",
                                      getPriorityColor(activeTicket.priority)
                                    )}
                                  >
                                    {activeTicket.priority || "medium"}
                                  </Badge>
                                </div>

                                {/* Sentiment */}
                                {activeTicket.sentiment && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                      Sentiment
                                    </span>
                                    <Badge
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border shadow-sm",
                                        getSentimentColor(activeTicket.sentiment)
                                      )}
                                    >
                                      {activeTicket.sentiment === "positive" ? "😊 positive" : activeTicket.sentiment === "negative" ? "😟 negative" : "😐 neutral"}
                                    </Badge>
                                  </div>
                                )}

                                {/* Opened Date */}
                                <div className="flex flex-col space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/40">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Opened Date
                                  </span>
                                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/30">
                                    <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400 opacity-90" />
                                    <span>
                                      {new Date(activeTicket.created_at).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic timeline flow mapping */}
                            <div
                              className={cn(
                                "rounded-xl border p-5 space-y-4.5 shadow-sm text-xs transition-all duration-300",
                                isDarkMode
                                  ? "bg-[#181a25]/70 border-slate-800/80 shadow-indigo-950/5"
                                  : "bg-white border-slate-200/80 shadow-slate-200/30"
                              )}
                            >
                              <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  Resolution Progress
                                </h4>
                              </div>

                              <div className="relative pl-0 pt-1">
                                {/* Timeline connecting line */}
                                <div className="absolute left-[14px] top-3 bottom-3 w-0.5 bg-slate-100 dark:bg-slate-800 -translate-x-1/2 -z-0">
                                  <div
                                    className="absolute top-0 left-0 w-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                                    style={{
                                      height:
                                        activeTicket.status === "resolved"
                                          ? "100%"
                                          : activeTicket.status === "in_progress"
                                          ? "50%"
                                          : "0%",
                                    }}
                                  />
                                </div>

                                <div className="space-y-6">
                                  {/* Step 1: Created */}
                                  <div className="flex items-start space-x-4 relative z-10">
                                    <div
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300 shrink-0",
                                        "bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20"
                                      )}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="text-left">
                                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Ticket Opened
                                      </h5>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                        {formatRelativeTime(activeTicket.created_at)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Step 2: Agent response */}
                                  <div className="flex items-start space-x-4 relative z-10">
                                    <div
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300 shrink-0",
                                        activeTicket.status !== "open"
                                          ? "bg-amber-500 border-amber-500 text-white shadow-amber-500/20"
                                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                                      )}
                                    >
                                      {activeTicket.status === "in_progress" ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    <div className="text-left">
                                      <h5
                                        className={cn(
                                          "font-bold text-xs transition-colors",
                                          activeTicket.status === "open"
                                            ? "text-slate-400 dark:text-slate-600"
                                            : "text-slate-800 dark:text-slate-200"
                                        )}
                                      >
                                        Agent In-Progress
                                      </h5>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                        {activeTicket.status !== "open"
                                          ? "In active support review"
                                          : "Awaiting agent assignment"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Step 3: Resolved */}
                                  <div className="flex items-start space-x-4 relative z-10">
                                    <div
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300 shrink-0",
                                        activeTicket.status === "resolved"
                                          ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20"
                                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                                      )}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="text-left">
                                      <h5
                                        className={cn(
                                          "font-bold text-xs transition-colors",
                                          activeTicket.status !== "resolved"
                                            ? "text-slate-400 dark:text-slate-600"
                                            : "text-slate-800 dark:text-slate-200"
                                        )}
                                      >
                                        Session Resolved
                                      </h5>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                        {activeTicket.status === "resolved"
                                          ? "Completed inquiry"
                                          : "Pending resolution"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* FEEDBACK SYSTEM: Submits ratings if resolved */}
                            {activeTicket.status === "resolved" && (
                              <div
                                className={cn(
                                  "rounded-xl border p-4.5 space-y-4 shadow-sm",
                                  isDarkMode
                                    ? "bg-indigo-950/10 border-indigo-500/20"
                                    : "bg-indigo-50/50 border-indigo-200/60"
                                )}
                              >
                                <h4
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider pb-2 border-b text-indigo-500 dark:text-indigo-400",
                                    isDarkMode ? "border-indigo-950" : "border-indigo-100"
                                  )}
                                >
                                  Submit Satisfaction Feedback
                                </h4>

                                {activeTicket.rating ? (
                                  <div className="space-y-2 text-center py-2">
                                    <div className="flex justify-center space-x-1 text-amber-500">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={cn(
                                            "w-5 h-5",
                                            i < (activeTicket.rating || 0)
                                              ? "fill-current"
                                              : "opacity-30"
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                      You rated this resolution:{" "}
                                      <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {activeTicket.rating}/5 stars
                                      </span>
                                      {activeTicket.feedback_comment && (
                                        <span className="italic block mt-1.5 font-normal">
                                          &ldquo;{activeTicket.feedback_comment}&rdquo;
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                                    <div className="flex flex-col items-center space-y-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                                        Tap to rate stars
                                      </span>
                                      <div className="flex space-x-1.5 py-1">
                                        {Array.from({ length: 5 }).map((_, i) => {
                                          const value = i + 1;
                                          const active =
                                            ratingHover !== null ? value <= ratingHover : value <= ratingVal;
                                          return (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => setRatingVal(value)}
                                              onMouseEnter={() => setRatingHover(value)}
                                              onMouseLeave={() => setRatingHover(null)}
                                              className="transition-transform active:scale-90"
                                            >
                                              <Star
                                                className={cn(
                                                  "w-6 h-6 transition-colors",
                                                  active
                                                    ? "text-amber-500 fill-amber-500"
                                                    : "text-slate-300 dark:text-slate-700"
                                                )}
                                              />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                                        Optional Comments
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={commentVal}
                                        onChange={(e) => setCommentVal(e.target.value)}
                                        placeholder="How was your resolution experience?"
                                        className={cn(
                                          "w-full rounded-lg border p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none",
                                          isDarkMode
                                            ? "bg-[#1d1f2d] border-slate-800 text-white"
                                            : "bg-white border-slate-200 text-slate-900"
                                        )}
                                      />
                                    </div>

                                    <Button
                                      type="submit"
                                      variant="primary"
                                      disabled={submitFeedbackMutation.isPending}
                                      className="w-full h-8.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center space-x-1"
                                    >
                                      {submitFeedbackMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <span>Submit Feedback</span>
                                      )}
                                    </Button>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <SkeletonCard />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty state on Lookup load */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full border flex items-center justify-center text-slate-400 mb-4 shadow-sm",
                        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
                      )}
                    >
                      <MessageSquare className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h4 className="text-sm font-bold tracking-tight">Select a Support Thread</h4>
                    <p
                      className={cn(
                        "text-xs max-w-xs leading-relaxed mt-1",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      Choose an open support session from the left listing view to see conversations or submit replies.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ────────────────────────────────────────────────────────────────
          DIALOG: CREATE SUPPORT TICKET WIZARD
         ──────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        title="Open Support Ticket"
        description="Fill out the details. Our automated ResolveIQ chatbot will respond instantly, and escalate to representatives if needed."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-left">
          {/* Email input is displayed if searchEmail is empty */}
          {!searchEmail && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pl-0.5">
                Your Email Address
              </label>
              <input
                type="email"
                required
                placeholder="customer@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className={cn(
                  "flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500",
                  isDarkMode
                    ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-indigo-500"
                    : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                )}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pl-0.5">
              Subject Inquiry
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Problem applying coupon on check-out"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500",
                isDarkMode
                  ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-indigo-500"
                  : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pl-0.5">
              Describe your issue
            </label>
            <textarea
              required
              rows={4}
              placeholder="Please provide full details about your request..."
              value={newInitialMsg}
              onChange={(e) => setNewInitialMsg(e.target.value)}
              className={cn(
                "flex w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none",
                isDarkMode
                  ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-indigo-500"
                  : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
              )}
            />
          </div>

          <div
            className={cn(
              "flex items-center justify-end space-x-3 pt-4 border-t",
              isDarkMode ? "border-slate-800" : "border-slate-100"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNewTicketOpen(false)}
              className="h-9 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTicketMutation.isPending}
              className="h-9 text-xs rounded-lg px-4 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 flex items-center space-x-1"
            >
              {createTicketMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span>Submit Ticket Request</span>
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Footer Powered By */}
      <footer
        className={cn(
          "h-10 border-t flex items-center justify-center select-none text-[10px] font-medium tracking-wide",
          isDarkMode
            ? "border-[#1e293b]/30 bg-[#0c0d12] text-slate-500"
            : "border-slate-100 bg-slate-50 text-slate-400"
        )}
      >
        <span>
          Powered by <span className="font-extrabold text-indigo-500/80 tracking-wider">RESOLVEIQ</span> Automation Suite
        </span>
      </footer>
    </div>
  );
}
