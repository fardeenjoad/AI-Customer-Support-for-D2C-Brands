/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  RefreshCw,
  Paperclip,
  X,
  FileCheck,
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
        <div className="min-h-screen bg-background dark:bg-[#0b0c10] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CustomerPortalContent />
    </Suspense>
  );
}

function CustomerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { logout, isAuthenticated, user } = useAuthStore();
  const [authHydrated, setAuthHydrated] = useState(false);
  
  // Scopes brand from URL param, then user's brand_id if authenticated, defaults to EcoStyle
  const brandId =
    searchParams.get("brand_id") ||
    (authHydrated ? user?.brand_id : undefined) ||
    "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  
  const { useBrandDetail } = useAnalytics();
  const { data: brandRes } = useBrandDetail(brandId);
  const brand = brandRes?.data;

  const isDarkMode = false;

  // Portal States
  const [emailInput, setEmailInput] = useState(searchParams.get("email") || "");
  const [searchEmail, setSearchEmail] = useState(searchParams.get("email") || "");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
      return unsub;
    }
  }, []);

  // Sync email input from authenticated user when loaded/hydrated
  useEffect(() => {
    if (authHydrated && user?.email && !searchParams.get("email")) {
      setEmailInput(user.email);
      setSearchEmail(user.email);
    }
  }, [authHydrated, user, searchParams]);

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
  const [portalFile, setPortalFile] = useState<File | null>(null);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const portalFileInputRef = useRef<HTMLInputElement>(null);

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

  // 2. Ticket detail + history — 3 seconds polling for real-time conversation sync
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
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const activeTicket = detailData?.ticket;
  const messages = useMemo(() => detailData?.messages || [], [detailData?.messages]);
  const hasAgentReplied = useMemo(() => messages.some((m) => m.sender === "agent"), [messages]);

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
      toast.error(getApiErrorMessage(err, "Failed to create ticket."));
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
    onMutate: async (content: string) => {
      if (!activeTicketId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["portal-details", activeTicketId, searchEmail] });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData<{ ticket: PortalTicket; messages: PortalMessage[] }>([
        "portal-details",
        activeTicketId,
        searchEmail,
      ]);

      // Optimistically append the customer message
      if (previousDetails) {
        const optimisticMsg: PortalMessage = {
          id: `temp-${Date.now()}`,
          ticket_id: activeTicketId,
          sender: "customer",
          content,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData<{ ticket: PortalTicket; messages: PortalMessage[] }>(
          ["portal-details", activeTicketId, searchEmail],
          {
            ...previousDetails,
            messages: [...previousDetails.messages, optimisticMsg],
          }
        );
      }

      return { previousDetails };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(
          ["portal-details", activeTicketId, searchEmail],
          context.previousDetails
        );
      }
      toast.error(getApiErrorMessage(err, "Failed to submit message."));
    },
    onSuccess: () => {
      setReplyText("");
    },
    onSettled: () => {
      refetchDetails();
      queryClient.invalidateQueries({ queryKey: ["portal-lookup", searchEmail] });
    },
  });

  // Portal Upload Attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", searchEmail);
      if (caption) {
        formData.append("caption", caption);
      }
      const res = await api.post(`/tickets/portal/${activeTicketId}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data?.data;
    },
    onMutate: async ({ file, caption }) => {
      if (!activeTicketId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["portal-details", activeTicketId, searchEmail] });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData<{ ticket: PortalTicket; messages: PortalMessage[] }>([
        "portal-details",
        activeTicketId,
        searchEmail,
      ]);

      // Optimistically append the attachment message
      if (previousDetails) {
        const contentStr = `[Attachment: ${file.name} (uploading...)]${caption ? `\n\n${caption}` : ""}`;
        const optimisticMsg: PortalMessage = {
          id: `temp-attach-${Date.now()}`,
          ticket_id: activeTicketId,
          sender: "customer",
          content: contentStr,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData<{ ticket: PortalTicket; messages: PortalMessage[] }>(
          ["portal-details", activeTicketId, searchEmail],
          {
            ...previousDetails,
            messages: [...previousDetails.messages, optimisticMsg],
          }
        );
      }

      return { previousDetails };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(
          ["portal-details", activeTicketId, searchEmail],
          context.previousDetails
        );
      }
      toast.error(getApiErrorMessage(err, "Attachment upload failed."));
    },
    onSuccess: () => {
      setPortalFile(null);
      setReplyText("");
      if (portalFileInputRef.current) {
        portalFileInputRef.current.value = "";
      }
      toast.success("Attachment uploaded successfully!");
    },
    onSettled: () => {
      refetchDetails();
      queryClient.invalidateQueries({ queryKey: ["portal-lookup", searchEmail] });
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
      toast.error(getApiErrorMessage(err, "Failed to submit feedback."));
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
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", emailInput.trim());
    router.replace(`/portal?${params.toString()}`, { scroll: false });
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
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = replyText.trim();
    const file = portalFile;
    if (!content && !file) return;

    // Clear inputs immediately for instant UI feedback
    setReplyText("");
    setPortalFile(null);
    if (portalFileInputRef.current) {
      portalFileInputRef.current.value = "";
    }

    try {
      if (file) {
        // Send file and message caption together (WhatsApp style)
        await uploadAttachmentMutation.mutateAsync({ file, caption: content || undefined });
      } else {
        // Regular text reply
        await sendReplyMutation.mutateAsync(content);
      }
    } catch (error) {
      console.error("Failed to submit message/file", error);
    }
  };

  // Determine portal brand configuration name
  const brandDisplayName = brand?.brand_name || "D2C Brand Store";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300 flex flex-col justify-between font-sans",
        isDarkMode ? "bg-[#0b0c10] text-[#f1f5f9]" : "bg-background text-text-primary"
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
              : "border-border bg-surface/70"
          )}
      >
        <div className="flex items-center space-x-3">
          <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
            isDarkMode
              ? "bg-primary/10 text-accent border-primary/20"
              : "bg-primary/10 text-primary border-primary/10"
          )}
          >
            <Terminal className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm tracking-wider uppercase">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-widest -mt-0.5",
                    isDarkMode ? "text-text-muted" : "text-text-muted"
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
                const params = new URLSearchParams(searchParams.toString());
                params.delete("email");
                router.replace(`/portal?${params.toString()}`, { scroll: false });
              }}
              className={cn(
                "text-xs font-semibold flex items-center space-x-1.5 transition-colors px-3 py-1.5 rounded-lg border",
                isDarkMode
                  ? "bg-[#1e293b] text-slate-300 border-slate-800 hover:text-white"
                  : "bg-surface text-text-primary border-border hover:bg-background"
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Change Email</span>
            </button>
          )}

          {/* LOGOUT BUTTON */}
          {authHydrated && isAuthenticated && (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className={cn(
                "text-xs font-semibold flex items-center space-x-1.5 transition-colors px-3 py-1.5 rounded-lg border",
              isDarkMode
                ? "bg-slate-800/80 text-rose-400 border-slate-700 hover:text-rose-300"
                : "bg-surface text-rose-600 border-border hover:bg-rose-50"
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
                    ? "bg-[#131520] border-slate-800 shadow-primary/10"
                    : "bg-surface border-border shadow-border/50"
                )}
              >
                {/* Decorative glow background for dark mode */}
                  {isDarkMode && (
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10" />
                  )}

                <div className="text-center space-y-4 mb-8">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border",
                    isDarkMode
                      ? "bg-slate-800/60 border-slate-700 text-accent"
                      : "bg-primary/10 border-primary/10 text-primary"
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
                        isDarkMode ? "text-text-muted" : "text-text-muted"
                      )}
                    >
                      Enter the email address used to open your support inquiry. We will locate all
                      active sessions.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <Input
                    label="Your Email Address"
                    type="email"
                    required
                    placeholder="e.g. customer@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-11 rounded-xl"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSearching}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium flex items-center justify-center space-x-2 shadow-lg shadow-primary/10"
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
                    <div className="flex-grow border-t border-border dark:border-slate-800"></div>
                    <span
                      className={cn(
                        "flex-shrink mx-4 text-[10px] uppercase font-bold tracking-widest",
                        isDarkMode ? "text-text-muted" : "text-text-muted"
                      )}
                    >
                      OR
                    </span>
                    <div className="flex-grow border-t border-border dark:border-slate-800"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(true)}
                  className={cn(
                    "w-full h-11 rounded-xl border font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors",
                    isDarkMode
                      ? "bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-accent"
                      : "bg-surface hover:bg-background border-border text-primary"
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
              className={cn(
                "flex-1 flex flex-col lg:flex-row border rounded-2xl overflow-hidden shadow-xl",
                isDarkMode ? "border-[#1e293b] bg-[#0e1017]" : "border-border bg-surface"
              )}
              style={{ height: "calc(100vh - 160px)" }}
            >
              {/* LEFT SIDEBAR: TICKETS LIST */}
              <div
                className={cn(
                  "w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r flex flex-col shrink-0",
                  isDarkMode ? "border-slate-800 bg-[#12141c]" : "border-border bg-background/50"
                )}
              >
                {/* Email Display Banner */}
                <div
                  className={cn(
                    "p-4 border-b flex items-center justify-between shrink-0 select-none",
                    isDarkMode ? "border-slate-800/80" : "border-border"
                  )}
                >
                  <div className="flex flex-col text-left">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isDarkMode ? "text-text-muted" : "text-text-muted"
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
                    className="h-8 px-2.5 rounded-lg text-xs bg-primary hover:bg-primary-hover text-white flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New</span>
                  </Button>
                </div>

                {/* Tickets list box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {ticketsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
                      <Inbox className="h-8 w-8 text-text-muted opacity-60 animate-bounce" />
                      <div>
                        <h4 className="text-xs font-bold">No active tickets found</h4>
                        <p
                          className={cn(
                            "text-[10px] mt-1 max-w-[180px] mx-auto leading-normal",
                            isDarkMode ? "text-text-muted" : "text-text-muted"
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
                                ? "bg-primary/15 border-primary/30 text-white"
                                : "bg-primary/10 border-primary/20 text-text-primary"
                              : isDarkMode
                              ? "bg-[#181a25] border-slate-800/60 hover:bg-[#1f2231] text-slate-300 hover:text-white"
                              : "bg-surface border-border hover:bg-background text-text-muted hover:text-text-primary"
                          )}
                        >
                          {/* Left Accent Bar on Active */}
                            {isActive && (
                              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                            )}

                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={cn(
                                "text-[9px] font-mono",
                                isActive
                                      ? isDarkMode
                                        ? "text-accent"
                                        : "text-primary font-bold"
                                      : isDarkMode
                                      ? "text-slate-500"
                                      : "text-text-muted"
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
                isDarkMode ? "text-text-muted" : "text-text-muted"
                              )}
                            >
                              {t.last_message_preview}
                            </p>
                          )}

                          <div
                            className={cn(
                              "flex items-center justify-between mt-2 pt-2 border-t text-[9px] font-medium uppercase tracking-wider",
                              isDarkMode ? "border-slate-800/40" : "border-border/50"
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
                        isDarkMode ? "border-slate-800/70" : "border-border"
                      )}
                    >
                        {/* Sub-header details */}
                        <div
                          className={cn(
                            "p-4 border-b select-none shrink-0 flex items-center justify-between",
                            isDarkMode ? "border-slate-800 bg-[#12141c]/50" : "border-border bg-surface"
                          )}
                        >
                          <div className="text-left">
                            <h3 className="text-sm font-bold tracking-tight">
                              {activeTicket?.subject}
                            </h3>
                            <span
                              className={cn(
                                "text-[10px] font-mono mt-0.5 block",
                                isDarkMode ? "text-text-muted" : "text-text-muted"
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
                                : "bg-surface border-border text-text-muted hover:text-text-primary hover:bg-background"
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
                          isDarkMode ? "bg-slate-900/10" : "bg-background/50"
                        )}
                      >
                        {isLoadingDetails ? (
                          <div className="space-y-4">
                            <SkeletonChatBubble />
                            <SkeletonChatBubble />
                          </div>
                        ) : (
                          <>
                            {messages.map((msg) => {
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
                                        ? "bg-slate-800 border-slate-700 text-accent"
                                        : "bg-primary/10 border-primary/10 text-primary"
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
                                        ? "bg-primary text-white rounded-bl-sm"
                                        : isDarkMode
                                        ? "bg-[#181a25] border border-slate-800/80 text-slate-200 rounded-br-sm"
                                        : "bg-surface border border-border text-text-primary rounded-br-sm"
                                    )}
                                  >
                                    {isAI && (
                                      <span className="flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider text-primary mb-1">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        <span>AI Support Assistant</span>
                                      </span>
                                    )}
                                    {(() => {
                                      const match = msg.content.match(/^\[Attachment:\s*(.*?)\s*\((.*?)\)\](?:\n\n([\s\S]*))?$/);
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
                                                  "flex items-center space-x-2 font-semibold bg-primary/10 border border-primary/20 rounded-lg p-2.5 max-w-sm mt-1 hover:underline",
                                                  isCustomer ? "text-white" : "text-primary"
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
                                      return msg.content;
                                    })()}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[9px] block text-right pr-1 select-none",
                                      isDarkMode ? "text-text-muted" : "text-text-muted"
                                    )}
                                  >
                                    {formatRelativeTime(msg.timestamp)}
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })}
                          <AnimatePresence>
                            {sendReplyMutation.isPending && !hasAgentReplied && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="flex w-full items-end space-x-2.5 my-3 justify-start"
                              >
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                                    isDarkMode
                                      ? "bg-slate-800 border-slate-700 text-accent"
                                      : "bg-primary/10 border-primary/10 text-primary"
                                  )}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col space-y-0.5">
                                  <div
                                    className={cn(
                                      "max-w-md px-4 py-3 text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm rounded-2xl flex items-center space-x-2",
                                      isDarkMode
                                        ? "bg-[#181a25] border border-slate-800/80 text-slate-200 rounded-br-sm"
                                        : "bg-surface border border-border text-text-primary rounded-br-sm"
                                    )}
                                  >
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                    <span className="font-medium">AI is formulating reply...</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                        <div ref={messageEndRef} />
                      </div>

                      {/* Reply Textbox Input */}
                      {activeTicket?.status !== "resolved" ? (
                        <div className="flex flex-col border-t border-border bg-surface/50 backdrop-blur-md shrink-0">
                          {/* File preview */}
                          {portalFile && (
                            <div className="flex items-center justify-between bg-surface/50 border border-border/85 rounded-lg p-2.5 m-3 max-w-sm animate-fadeIn text-xs text-text-primary">
                              <div className="flex items-center space-x-2">
                                <FileCheck className="h-4 w-4 text-accent animate-pulse" />
                                <span className="font-semibold truncate max-w-[200px]">{portalFile.name}</span>
                                <span className="text-[10px] text-text-muted">({(portalFile.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPortalFile(null);
                                  if (portalFileInputRef.current) portalFileInputRef.current.value = "";
                                }}
                                className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          <form
                            onSubmit={handleSendReply}
                            className="p-4 flex items-center space-x-3"
                          >
                            <input
                              type="file"
                              ref={portalFileInputRef}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setPortalFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => portalFileInputRef.current?.click()}
                              disabled={uploadAttachmentMutation.isPending}
                              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-background/50 transition-colors"
                              title="Attach file"
                            >
                              {uploadAttachmentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                              ) : (
                                <Paperclip className="h-4.5 w-4.5" />
                              )}
                            </button>

                            <input
                              type="text"
                              placeholder="Add a reply to this ticket..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className={cn(
                                "flex-grow h-10 rounded-xl border px-3 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
                                isDarkMode
                                  ? "bg-[#1d1f2d] border-slate-800 text-white focus:border-primary"
                                  : "bg-background border-border text-text-primary focus:border-primary"
                              )}
                            />
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={(!replyText.trim() && !portalFile) || sendReplyMutation.isPending || uploadAttachmentMutation.isPending}
                              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs flex items-center space-x-1 shadow-md shadow-primary/10"
                            >
                              {sendReplyMutation.isPending || uploadAttachmentMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Send</span>
                                </>
                              )}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        /* Informational Locked Banner when Resolved */
                        <div
                          className={cn(
                            "p-4 border-t text-center text-xs font-medium shrink-0",
                            isDarkMode
                              ? "bg-slate-900/40 border-slate-800 text-slate-400"
                              : "bg-background border-border text-text-muted"
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
                        isDarkMode ? "bg-[#12141c]/40" : "bg-background/20"
                      )}
                    >
                      {/* Sidebar Header */}
                      <div
                        className={cn(
                          "p-4 border-b select-none shrink-0 flex items-center justify-between",
                          isDarkMode ? "border-slate-800 bg-[#12141c]/50" : "border-slate-200 bg-white"
                        )}
                      >
                          <span className="text-[10px] font-extrabold text-text-muted dark:text-text-muted uppercase tracking-widest py-1.5">
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
                                  ? "bg-[#181a25]/70 border-slate-800/80 shadow-primary/5"
                                  : "bg-surface border-border shadow-border/30"
                              )}
                            >
                              <div className="flex items-center space-x-2 pb-2.5 border-b border-border/50 dark:border-slate-800/60">
                                <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-accent">
                                  <Inbox className="h-3.5 w-3.5" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-slate-200">
                                  Support Details
                                </h4>
                              </div>

                              <div className="space-y-3.5">
                                {/* Ticket ID */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-text-muted dark:text-text-muted uppercase tracking-wider">
                                    Ticket ID
                                  </span>
                                  <span className="text-xs font-mono font-medium text-text-primary dark:text-slate-300">
                                    #{activeTicket.id.slice(0, 8)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-text-muted dark:text-text-muted uppercase tracking-wider">
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
                                  <span className="text-[10px] font-bold text-text-muted dark:text-text-muted uppercase tracking-wider">
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
                                    <span className="text-[10px] font-bold text-text-muted dark:text-text-muted uppercase tracking-wider">
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
                                <div className="flex flex-col space-y-1.5 pt-2.5 border-t border-border/50 dark:border-slate-800/40">
                                  <span className="text-[10px] font-bold text-text-muted dark:text-text-muted uppercase tracking-wider">
                                    Opened Date
                                  </span>
                                  <div className="text-xs font-semibold text-text-primary dark:text-slate-300 flex items-center space-x-2 bg-background dark:bg-slate-800/40 rounded-xl p-2.5 border border-border/50 dark:border-slate-800/30">
                                    <Calendar className="h-4 w-4 text-primary dark:text-accent opacity-90" />
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
                                  ? "bg-[#181a25]/70 border-slate-800/80 shadow-primary/5"
                                  : "bg-surface border-border shadow-border/30"
                              )}
                            >
                              <div className="flex items-center space-x-2 pb-2.5 border-b border-border/50 dark:border-slate-800/60">
                                <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-accent">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-slate-200">
                                  Resolution Progress
                                </h4>
                              </div>

                              <div className="relative pl-0 pt-1">
                                {/* Timeline connecting line */}
                                <div className="absolute left-[14px] top-3 bottom-3 w-0.5 bg-border/50 dark:bg-slate-800 -translate-x-1/2 -z-0">
                                  <div
                                    className="absolute top-0 left-0 w-full bg-primary dark:bg-accent transition-all duration-500"
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
                                        "bg-primary border-primary text-white shadow-primary/20"
                                      )}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="text-left">
                                      <h5 className="font-bold text-xs text-text-primary dark:text-slate-200">
                                        Ticket Opened
                                      </h5>
                                      <span className="text-[10px] text-text-muted dark:text-text-muted block mt-0.5">
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
                                            ? "text-text-muted dark:text-slate-600"
                                            : "text-text-primary dark:text-slate-200"
                                        )}
                                      >
                                        Agent In-Progress
                                      </h5>
                                      <span className="text-[10px] text-text-muted dark:text-text-muted block mt-0.5">
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
                                            ? "text-text-muted dark:text-slate-600"
                                            : "text-text-primary dark:text-slate-200"
                                        )}
                                      >
                                        Session Resolved
                                      </h5>
                                      <span className="text-[10px] text-text-muted dark:text-text-muted block mt-0.5">
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
                                ? "bg-primary/10 border-primary/20"
                                : "bg-primary/5 border-primary/20"
                                )}
                              >
                                <h4
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider pb-2 border-b text-primary dark:text-accent",
                                  isDarkMode ? "border-primary/20" : "border-primary/10"
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
                                    <p className="text-[11px] text-text-muted dark:text-text-muted leading-normal">
                                      You rated this resolution:{" "}
                                      <span className="font-bold text-text-primary dark:text-slate-200">
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
                                          "w-full rounded-lg border p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none",
                                          isDarkMode
                                            ? "bg-[#1d1f2d] border-slate-800 text-white"
                                            : "bg-surface border-border text-text-primary"
                                        )}
                                      />
                                    </div>

                                    <Button
                                      type="submit"
                                      variant="primary"
                                      disabled={submitFeedbackMutation.isPending}
                                      className="w-full h-8.5 rounded-lg text-xs bg-primary hover:bg-primary-hover text-white font-semibold flex items-center justify-center space-x-1"
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
                        "w-12 h-12 rounded-full border flex items-center justify-center text-text-muted mb-4 shadow-sm",
                        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-surface border-border"
                      )}
                    >
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold tracking-tight">Select a Support Thread</h4>
                    <p
                      className={cn(
                        "text-xs max-w-xs leading-relaxed mt-1",
                        isDarkMode ? "text-text-muted" : "text-text-muted"
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
            <Input
              label="Your Email Address"
              type="email"
              required
              placeholder="customer@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="h-10 text-xs"
            />
          )}

          <Input
            label="Subject Inquiry"
            type="text"
            required
            placeholder="e.g. Problem applying coupon on check-out"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="h-10 text-xs"
          />

          <div className="flex flex-col space-y-1.5 w-full text-left">
            <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider pl-0.5">
              Describe your issue
            </label>
            <textarea
              required
              rows={4}
              placeholder="Please provide full details about your request..."
              value={newInitialMsg}
              onChange={(e) => setNewInitialMsg(e.target.value)}
              className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
            />
          </div>

          <div
            className={cn(
              "flex items-center justify-end space-x-3 pt-4 border-t",
              isDarkMode ? "border-slate-800" : "border-border/50"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNewTicketOpen(false)}
              className="h-9 text-xs rounded-lg hover:bg-background dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTicketMutation.isPending}
              className="h-9 text-xs rounded-lg px-4 bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/10 flex items-center space-x-1"
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
            : "border-border/50 bg-background text-text-muted"
        )}
      >
        <span>
          Powered by <span className="font-extrabold text-primary/80 tracking-wider">RESOLVEIQ</span> Automation Suite
        </span>
      </footer>
    </div>
  );
}
