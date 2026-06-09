"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageSquare,
  X,
  Bot,
  Send,
  Minus,
  Paperclip,
  ExternalLink,
  Loader2,
  Zap,
  Ticket,
  HelpCircle,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useTickets, Message } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatRelativeTime, cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
//  Props
// ────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  brandId: string;
  brandColor?: string;
  brandName?: string;
  brandLogo?: string;
  portalUrl?: string;
}

// ────────────────────────────────────────────────────────────────
//  Widget Chat Bubble (inline — self-contained)
// ────────────────────────────────────────────────────────────────

function WidgetBubble({
  message,
  brandColor,
}: {
  message: Message;
  brandColor: string;
}) {
  const isCustomer = message.sender === "customer";
  const isAI = message.sender === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex items-end space-x-2 my-2.5", {
        "justify-end flex-row-reverse space-x-reverse": isCustomer,
        "justify-start": !isCustomer,
      })}
    >
      {/* Avatar */}
      {!isCustomer && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: `${brandColor}15`,
            border: `1px solid ${brandColor}30`,
          }}
        >
          <Bot className="h-3.5 w-3.5" style={{ color: brandColor }} />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn("max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm", {
          "rounded-2xl rounded-br-sm text-white": isCustomer,
          "rounded-2xl rounded-bl-sm bg-[#1a1a24] border border-[#2a2a3a] text-[#e2e8f0]":
            !isCustomer,
        })}
        style={
          isCustomer
            ? { background: brandColor }
            : undefined
        }
      >
        {isAI && (
          <div
            className="flex items-center space-x-1 text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60"
            style={{ color: brandColor }}
          >
            <Zap className="h-2.5 w-2.5" />
            <span>AI</span>
          </div>
        )}
        {(() => {
          const match = message.content.match(/^\[Attachment:\s*(.*?)\s*\((.*?)\)\](?:\n\n([\s\S]*))?$/);
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
                      <img
                        src={url}
                        alt={filename}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                      />
                    </a>
                    <div className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 text-[10px] border-t border-black/10",
                      isCustomer ? "text-white" : "text-slate-200"
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
                      "flex items-center space-x-2 font-semibold border rounded-lg p-2.5 hover:underline text-xs bg-black/20 border-black/10",
                      isCustomer ? "text-white" : "text-[#93c5fd]"
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
          return message.content;
        })()}
      </div>

      {/* Timestamp — only on hover for cleanliness */}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Typing Dots
// ────────────────────────────────────────────────────────────────

function TypingDots({ brandColor }: { brandColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-end space-x-2 my-2.5"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: `${brandColor}15`,
          border: `1px solid ${brandColor}30`,
        }}
      >
        <Bot className="h-3.5 w-3.5" style={{ color: brandColor }} />
      </div>
      <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Ticket Created Toast
// ────────────────────────────────────────────────────────────────

function TicketCreatedBanner({
  ticketId,
  brandColor,
}: {
  ticketId: string;
  brandColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mx-auto my-3 flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-medium max-w-[85%]"
      style={{
        background: `${brandColor}10`,
        border: `1px solid ${brandColor}25`,
        color: brandColor,
      }}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span>
        Ticket <span className="font-bold font-mono">#{ticketId.slice(0, 8)}</span> created
      </span>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MAIN WIDGET
// ────────────────────────────────────────────────────────────────

export function ChatWidget({
  brandId,
  brandColor = "#3b82f6",
  brandName,
  brandLogo,
  portalUrl = "/portal",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showTicketBanner, setShowTicketBanner] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data hooks ──
  const { useBrandDetail } = useAnalytics();
  const { data: brandRes } = useBrandDetail(brandId);
  const brand = brandRes?.data;

  const { useGetChatHistory, sendChatMessage, isSending } = useChat();
  const { data: historyRes } = useGetChatHistory(ticketId || "", !!ticketId && isOpen);
  const messages = useMemo(() => historyRes?.data || [], [historyRes?.data]);

  const { createTicket, uploadAttachment } = useTickets();

  const displayName = brandName || brand?.brand_name || "Support";
  const greeting =
    brand?.custom_greeting ||
    `Hi there! 👋 Welcome to ${displayName} support. How can we help you today?`;

  // ── Unread tracking ──
  useEffect(() => {
    if (!isOpen && messages.length > prevMessageCount) {
      setUnreadCount((c) => c + (messages.length - prevMessageCount));
    }
    setPrevMessageCount(messages.length);
  }, [messages.length, isOpen, prevMessageCount]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isSending]);

  // ── Focus input on open ──
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // ── Handlers ──

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleSendMessage = async () => {
    const content = messageText.trim();
    const currentFile = file;
    if (!content && !currentFile) return;

    let activeTicketId = ticketId;

    // Clear inputs immediately for instant UI feedback
    setMessageText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      // First message: create a ticket
      if (!activeTicketId) {
        const initRes = await createTicket({
          brand_id: brandId,
          subject: `Chat — ${displayName}`,
          initial_message: content || (currentFile ? `Attachment: ${currentFile.name}` : "Attachment"),
        });
        activeTicketId = initRes.data.id;
        setTicketId(activeTicketId);
        setShowTicketBanner(true);
        // Auto-hide banner after 5s
        setTimeout(() => setShowTicketBanner(false), 5000);
      }

      if (currentFile && activeTicketId) {
        // Send S3 attachment and caption together (WhatsApp style)
        await uploadAttachment({ ticketId: activeTicketId, file: currentFile, caption: content || undefined });
      } else if (content && ticketId) {
        // Subsequent text replies
        await sendChatMessage({
          brand_id: brandId,
          message: content,
        });
      }
    } catch {
      // Error handled by hook toasts
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && (messageText.trim() || file)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFAQClick = (question: string) => {
    setMessageText(question);
    // Small delay so user sees the text appear before send
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {/* ════════════════════════════════════
          CHAT WINDOW
         ════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{
              type: "spring",
              damping: 22,
              stiffness: 300,
              mass: 0.8,
            }}
            className="w-[380px] h-[580px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border"
            style={{
              background: "#0d0d14",
              borderColor: "#1e1e2e",
            }}
          >
            {/* ── Header ── */}
            <div
              className="relative px-4 py-3.5 flex items-center justify-between shrink-0"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
              }}
            >
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                }}
              />

              <div className="flex items-center space-x-3 relative z-10">
                {/* Brand Logo or Default */}
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/10">
                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={displayName}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <Bot className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white tracking-tight">
                    {displayName}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {/* Online dot */}
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                    <span className="text-[10px] text-white/70 font-medium">
                      Powered by AI · Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 relative z-10">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Chat Body ── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{ background: "#0d0d14" }}
            >
              {/* Welcome message */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-col items-center text-center px-4 py-8 space-y-4"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{
                      background: `${brandColor}15`,
                      border: `1px solid ${brandColor}25`,
                    }}
                  >
                    <MessageSquare
                      className="h-7 w-7"
                      style={{ color: brandColor }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[#f1f5f9]">
                      {greeting}
                    </h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed max-w-[260px]">
                      Our AI assistant will help you instantly. A human agent
                      will step in if needed.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Ticket created banner */}
              <AnimatePresence>
                {showTicketBanner && ticketId && (
                  <TicketCreatedBanner
                    ticketId={ticketId}
                    brandColor={brandColor}
                  />
                )}
              </AnimatePresence>

              {/* Messages */}
              {messages.map((msg) => (
                <WidgetBubble
                  key={msg.id}
                  message={msg}
                  brandColor={brandColor}
                />
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isSending && <TypingDots brandColor={brandColor} />}
              </AnimatePresence>

              <div ref={chatEndRef} />
            </div>

            {/* ── FAQ Suggestions (only when no messages) ── */}
            <AnimatePresence>
              {messages.length === 0 &&
                brand?.faqs &&
                brand.faqs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2 shrink-0 overflow-hidden"
                    style={{ background: "#0d0d14" }}
                  >
                    <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-widest block mb-2 pl-0.5">
                      Quick Questions
                    </span>
                    <div className="flex flex-col space-y-1.5 max-h-28 overflow-y-auto">
                      {brand.faqs.slice(0, 3).map((faq, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFAQClick(faq.question)}
                          className="text-left text-[11px] text-[#c8d0da] bg-[#12121c] border border-[#1e1e2e] rounded-xl px-3 py-2 transition-all duration-200 hover:border-opacity-60"
                          style={{
                            // @ts-ignore
                            "--hover-border": brandColor,
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.borderColor = `${brandColor}50`;
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.borderColor = "#1e1e2e";
                          }}
                        >
                          <HelpCircle
                            className="h-3 w-3 inline mr-1.5 opacity-40"
                            style={{ color: brandColor }}
                          />
                          {faq.question}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* ── File attachment preview ── */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-1 overflow-hidden"
                  style={{ background: "#0d0d14" }}
                >
                  <div className="flex items-center justify-between bg-[#12121c] border border-[#1e1e2e] rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2 text-[11px] text-[#c8d0da] min-w-0">
                      <FileCheck
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: brandColor }}
                      />
                      <span className="truncate max-w-[180px] font-medium">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-[#64748b] shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-1 rounded text-[#64748b] hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input Area ── */}
            <div
              className="px-3 py-3 border-t shrink-0"
              style={{
                background: "#0d0d14",
                borderColor: "#1e1e2e",
              }}
            >
              <div
                className="flex items-center space-x-2 rounded-xl px-3 py-2 border transition-colors"
                style={{
                  background: "#12121c",
                  borderColor: "#1e1e2e",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${brandColor}50`;
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#1e1e2e";
                }}
              >
                {/* Attach file */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded text-[#64748b] hover:text-[#c8d0da] transition-colors shrink-0"
                  title="Attach file"
                  disabled={isSending}
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1 bg-transparent border-0 outline-none text-[13px] text-[#e2e8f0] placeholder-[#4a5568] py-1"
                />

                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !file) || isSending}
                  className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30 shrink-0"
                  style={{
                    background:
                      messageText.trim() || file ? brandColor : "transparent",
                    color:
                      messageText.trim() || file ? "#ffffff" : "#64748b",
                  }}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Footer: Portal link + Branding */}
              <div className="flex items-center justify-between mt-2.5 px-1">
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-medium flex items-center space-x-1 transition-colors"
                  style={{ color: `${brandColor}99` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = brandColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = `${brandColor}99`;
                  }}
                >
                  <Ticket className="h-3 w-3" />
                  <span>Track your tickets</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <span className="text-[9px] text-[#4a5568] flex items-center space-x-1">
                  <Zap className="h-2.5 w-2.5" />
                  <span>
                    Powered by{" "}
                    <span className="font-bold text-[#64748b]">ResolveIQ</span>
                  </span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════
          FLOATING BUTTON
         ════════════════════════════════════ */}
      <motion.button
        onClick={isOpen && isMinimized ? handleOpen : isOpen ? handleClose : handleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-shadow duration-300"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
          boxShadow: `0 4px 24px ${brandColor}40`,
        }}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: brandColor }}
          />
        )}

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !isOpen && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2"
              style={{ borderColor: "#0d0d14" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Icon swap animation */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isMinimized ? (
                <MessageSquare className="h-6 w-6 text-white" />
              ) : (
                <X className="h-6 w-6 text-white" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="chat-icon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
