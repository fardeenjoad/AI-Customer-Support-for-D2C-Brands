"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "customer" | "ai";
  content: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { id: "track", label: "📦 Track Order" },
  { id: "return", label: "🔄 Return Product" },
  { id: "refund", label: "💰 Refund Status" },
  { id: "human", label: "👤 Talk to Human" },
];

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      content: "Hello! I am your AI D2C Assistant. How can I help you with your order today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // 1. Add Customer Message
    const customerMsg: Message = {
      id: `customer-${Date.now()}`,
      sender: "customer",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, customerMsg]);
    setIsTyping(true);

    // 2. Simulate AI response delay
    setTimeout(() => {
      let replyText = "I'm processing that. Let me look it up in the knowledge base...";
      
      const query = text.toLowerCase();
      if (query.includes("track") || query.includes("order")) {
        replyText = "Sure! To track your package, please reply with your Order ID (e.g., #1084) or the email address used during purchase.";
      } else if (query.includes("return")) {
        replyText = "Returns are easy! D2C brands offer free returns within 30 days. Would you like me to generate a prepaid return shipping label for your last order?";
      } else if (query.includes("refund")) {
        replyText = "Once we receive your returned item, refunds take 3-5 business days to credit back to your card. I can check your refund queue if you provide the order ID.";
      } else if (query.includes("human") || query.includes("agent") || query.includes("talk to")) {
        replyText = "Understood. Transferring you to our live human support queue. An agent will review our conversation history and respond in a few moments! 👤";
      } else {
        replyText = "That's a great question! Based on our guidelines: we process shipments in 24 hours, accept 30-day returns, and resolve issues instantly. Let me know if you need more details!";
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1100);
  };

  const handleQuickAction = (actionLabel: string) => {
    // Send message as customer
    handleSendMessage(actionLabel.substring(2)); // strip out the icon emoji
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        content: "Hello! I am your AI D2C Assistant. How can I help you with your order today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* ── Chat Widget Launcher Button ── */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full gradient-primary text-[#FDFBF7] flex items-center justify-center shadow-lg hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-50 select-none",
          isOpen && "pointer-events-none opacity-0 scale-75"
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
        title="Open D2C AI Copilot Simulator"
      >
        <span className="relative flex h-full w-full items-center justify-center">
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#14B8A6] items-center justify-center">
              <Sparkles className="h-2 w-2 text-white fill-white" />
            </span>
          </span>
        </span>
      </motion.button>

      {/* ── Expanded Chat Window drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed bottom-6 right-6 w-[360px] h-[520px] rounded-2xl border border-border bg-[#FDFBF7] shadow-2xl flex flex-col overflow-hidden z-50 select-none text-left"
          >
            {/* Header section */}
            <div className="bg-[#0F766E] p-4 text-[#FDFBF7] flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2.5">
                <div className="w-8.5 h-8.5 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center border border-[#14B8A6]/30">
                  <Bot className="h-4.5 w-4.5 text-[#14B8A6] fill-[#14B8A6]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-heading tracking-wide flex items-center">
                    AI Copilot Simulator
                    <Sparkles className="h-3 w-3 text-[#14B8A6] ml-1 fill-[#14B8A6]" />
                  </h4>
                  <span className="text-[9px] text-[#14B8A6] font-semibold uppercase tracking-wider block">
                    Online · Instantly Replies
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleResetChat}
                  className="p-1 rounded-md text-[#FDFBF7]/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reset conversation"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-[#FDFBF7]/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Minimize"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body Pane */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F1EA] scrollbar-thin">
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start space-x-2 max-w-[85%] animate-fadeIn",
                      isAI ? "mr-auto text-left" : "ml-auto flex-row-reverse space-x-reverse text-right"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border select-none",
                      isAI 
                        ? "bg-[#0F766E]/10 border-[#0F766E]/20 text-[#0F766E]" 
                        : "bg-[#14B8A6]/20 border-[#14B8A6]/30 text-[#14B8A6]"
                    )}>
                      {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    
                    <div className="space-y-1">
                      <div className={cn(
                        "rounded-2xl px-3.5 py-2 text-xs shadow-sm leading-relaxed whitespace-pre-line border",
                        isAI 
                          ? "bg-[#FDFBF7] text-[#1C2E2C] border-[#E5E0D8] rounded-tl-sm" 
                          : "bg-[#0F766E] text-[#FDFBF7] border-[#0D625B] rounded-tr-sm"
                      )}>
                        {msg.content}
                      </div>
                      <span className="text-[8px] text-text-muted block px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start space-x-2 max-w-[85%] mr-auto text-left animate-fadeIn">
                  <div className="w-7 h-7 rounded-full bg-[#0F766E]/10 border-[#0F766E]/20 text-[#0F766E] flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-[#FDFBF7] text-text-muted border border-[#E5E0D8] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs shadow-sm flex items-center space-x-1.5 shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin text-[#0F766E]" />
                    <span>AI is formulating reply...</span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions Pills Overlay (visible only when not typing) */}
            <div className="p-3 bg-[#FDFBF7] border-t border-border space-y-2 shrink-0">
              {!isTyping && (
                <div className="flex flex-wrap gap-1.5 justify-center py-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.label)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-full border border-border bg-[#FDFBF7] text-[#0F766E] hover:bg-[#0F766E]/5 hover:border-[#0F766E] transition-all flex items-center space-x-1 shadow-sm active:scale-95"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="h-2.5 w-2.5 opacity-50 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Text input footer */}
              <div className="flex items-center space-x-2 border border-border rounded-xl px-2.5 py-1.5 bg-[#F4F1EA]/50">
                <input
                  type="text"
                  placeholder="Ask a customer support query..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage(inputValue);
                      setInputValue("");
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none placeholder-text-muted/70 px-1"
                />
                <button
                  onClick={() => {
                    handleSendMessage(inputValue);
                    setInputValue("");
                  }}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-1.5 rounded-lg bg-[#0F766E] text-[#FDFBF7] hover:bg-[#0D625B] disabled:opacity-40 disabled:hover:bg-[#0F766E] transition-all shrink-0 shadow-sm"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
