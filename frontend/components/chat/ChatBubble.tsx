import { Message } from "@/hooks/useTickets";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, User, UserCog } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { sender, content, created_at, timestamp } = message;
  const timeToFormat = created_at || timestamp;

  const isCustomer = sender === "customer";
  const isAI = sender === "ai";
  const isAgent = sender === "agent";

  return (
    <div
      className={cn("flex w-full items-start space-x-3 my-4 animate-fadeIn", {
        "justify-end flex-row-reverse space-x-reverse": isCustomer,
        "justify-start": !isCustomer,
      })}
    >
      {/* Sender Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-xs shadow-sm",
          {
            "bg-surface border-border text-text-muted": isCustomer,
            "bg-accent/10 border-accent/20 text-accent": isAI,
            "bg-primary/10 border-primary/20 text-primary": isAgent,
          }
        )}
      >
        {isCustomer && <User className="h-4 w-4" />}
        {isAI && <Bot className="h-4 w-4" />}
        {isAgent && <UserCog className="h-4 w-4" />}
      </div>

      {/* Bubble Message Panel */}
      <div className="flex flex-col max-w-[70%] space-y-1">
        {/* Name and time metadata */}
        <div
          className={cn("flex items-center space-x-2 text-[10px] text-text-muted", {
            "justify-end": isCustomer,
            "justify-start": !isCustomer,
          })}
        >
          <span className="font-semibold uppercase tracking-wider">
            {isCustomer ? "Customer" : isAI ? "ResolveIQ Bot" : "Support Agent"}
          </span>
          <span>•</span>
          <span>{formatRelativeTime(timeToFormat || "")}</span>
        </div>

        {/* Message bubble */}
        <div
          className={cn("px-4 py-2.5 rounded-2xl border text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap", {
            "bg-surface border-border text-text-primary rounded-tl-none": isCustomer,
            "bg-accent/10 border-accent/30 text-text-primary rounded-tr-none text-glow-cyan": isAI,
            "bg-primary/10 border-primary/30 text-text-primary rounded-tr-none text-glow": isAgent,
          })}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
