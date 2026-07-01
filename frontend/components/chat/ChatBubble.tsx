/* eslint-disable @next/next/no-img-element */
import { Message } from "@/hooks/useTickets";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, User, UserCog, Paperclip } from "lucide-react";

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
        "flex-row-reverse space-x-reverse justify-start": isAgent,
        "justify-start": !isAgent,
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
      <div className={cn("flex flex-col max-w-[70%] space-y-1", {
        "items-end": isAgent,
        "items-start": !isAgent,
      })}>
        {/* Name metadata */}
        <div className="flex items-center space-x-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted select-none">
          <span>{isCustomer ? "Customer" : isAI ? "ResolveIQ Bot" : "Support Agent"}</span>
        </div>

        {/* Message bubble */}
        <div
          className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap min-h-[40px] flex flex-col justify-center", {
            "bg-gray-100 text-gray-800 rounded-tl-sm": !isAgent,
            "bg-indigo-600 text-white rounded-tr-sm": isAgent,
          })}
        >
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
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] border-t border-black/10 text-text-muted">
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
                        "flex items-center space-x-2 font-semibold border rounded-lg p-2 hover:underline text-xs bg-black/5 border-black/10 text-primary"
                      )}
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[150px]">{filename}</span>
                    </a>
                  )}
                  {caption && <div className="text-xs pt-0.5 leading-relaxed text-text-primary">{caption}</div>}
                </div>
              );
            }
            return content;
          })()}
        </div>
        <span className="text-xs text-gray-400 mt-1 block select-none">
          {formatRelativeTime(timeToFormat || "")}
        </span>
      </div>
    </div>
  );
}
