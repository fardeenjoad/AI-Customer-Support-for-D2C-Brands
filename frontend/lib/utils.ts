import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date, pattern: string = "MMM dd, yyyy hh:mm a") {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  return format(date, pattern);
}

export function formatRelativeTime(dateString: string | Date) {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getPriorityColor(priority: string) {
  const p = priority?.toLowerCase() || "";
  switch (p) {
    case "urgent":
      return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-400 border border-orange-500/30";
    case "medium":
      return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    case "low":
    default:
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  }
}

export function getStatusColor(status: string) {
  const s = status?.toLowerCase() || "";
  switch (s) {
    case "resolved":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    case "in_progress":
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    case "open":
    default:
      return "bg-purple-500/15 text-purple-400 border border-purple-500/30";
  }
}

export function getSentimentColor(sentiment: string) {
  const s = sentiment?.toLowerCase() || "";
  switch (s) {
    case "positive":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    case "negative":
      return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "neutral":
    default:
      return "bg-slate-500/15 text-slate-400 border border-slate-500/30";
  }
}

export function truncateText(text: string, maxLength: number = 60) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
