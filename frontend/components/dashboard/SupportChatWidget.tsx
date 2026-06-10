"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Loader2,
  MessageSquare,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  User,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "customer" | "ai";
  content: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { id: "track", label: "Track Order", icon: PackageSearch },
  { id: "return", label: "Return Product", icon: RefreshCw },
  { id: "refund", label: "Refund Status", icon: Sparkles },
  { id: "human", label: "Talk to Human", icon: UserRound },
];

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    sender: "ai",
    content: "Hello. I am your AI D2C assistant. How can I help with your order today?",
    timestamp: "",
  },
];

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome" && !message.timestamp
          ? { ...message, timestamp: timestamp() }
          : message
      )
    );
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const customerMsg: Message = {
      id: `customer-${Date.now()}`,
      sender: "customer",
      content: text,
      timestamp: timestamp(),
    };

    setMessages((prev) => [...prev, customerMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const query = text.toLowerCase();
      let replyText = "I am checking the knowledge base and support policies for that request.";

      if (query.includes("track") || query.includes("order")) {
        replyText =
          "To track your package, reply with your order ID or the email address used at checkout.";
      } else if (query.includes("return")) {
        replyText =
          "Returns are available within 30 days. I can help start the return and route any exception to an agent.";
      } else if (query.includes("refund")) {
        replyText =
          "Refunds usually take 3-5 business days after the returned item is received. Share the order ID and I will check the status.";
      } else if (query.includes("human") || query.includes("agent") || query.includes("talk to")) {
        replyText =
          "Understood. I am transferring this conversation to the human support queue with the full history attached.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          content: replyText,
          timestamp: timestamp(),
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        content: "Hello. I am your AI D2C assistant. How can I help with your order today?",
        timestamp: timestamp(),
      },
    ]);
    setInputValue("");
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-50 select-none",
          isOpen && "pointer-events-none opacity-0 scale-75"
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
        title="Open AI copilot simulator"
      >
        <span className="relative flex h-full w-full items-center justify-center">
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent ring-2 ring-white" />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] rounded-lg border border-border bg-white shadow-xl flex flex-col overflow-hidden z-50 select-none text-left"
          >
            <div className="bg-white border-b border-border p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-wide flex items-center text-text-primary">
                    AI Copilot Simulator
                  </h4>
                  <span className="text-[9px] text-accent font-semibold uppercase tracking-wider block">
                    Online - instant replies
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleResetChat}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
                  title="Reset conversation"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
                  title="Minimize"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin">
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
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border select-none",
                        isAI
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-accent/10 border-accent/20 text-accent"
                      )}
                    >
                      {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={cn(
                          "rounded-lg px-3.5 py-2 text-xs shadow-sm leading-relaxed whitespace-pre-line border",
                          isAI
                            ? "bg-white text-text-primary border-border"
                            : "bg-primary text-white border-primary"
                        )}
                      >
                        {msg.content}
                      </div>
                      {msg.timestamp && (
                        <span className="text-[8px] text-text-muted block px-1">{msg.timestamp}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-start space-x-2 max-w-[85%] mr-auto text-left animate-fadeIn">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-white text-text-muted border border-border rounded-lg px-3.5 py-2.5 text-xs shadow-sm flex items-center space-x-1.5 shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>AI is preparing a reply...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-border space-y-2 shrink-0">
              {!isTyping && (
                <div className="flex flex-wrap gap-1.5 justify-center py-1">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleSendMessage(action.label)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-full border border-border bg-white text-primary hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center space-x-1 shadow-sm active:scale-95"
                      >
                        <Icon className="h-3 w-3" />
                        <span>{action.label}</span>
                        <ArrowRight className="h-2.5 w-2.5 opacity-50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center space-x-2 border border-border rounded-lg px-2.5 py-1.5 bg-white">
                <input
                  type="text"
                  placeholder="Ask a support question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage(inputValue);
                      setInputValue("");
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none placeholder:text-slate-400 px-1"
                />
                <button
                  onClick={() => {
                    handleSendMessage(inputValue);
                    setInputValue("");
                  }}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary transition-all shrink-0 shadow-sm"
                  title="Send message"
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
