import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseDate(dateString: string | Date): Date {
  if (dateString instanceof Date) return dateString;
  if (typeof dateString !== "string") return new Date(dateString);

  // If it's an ISO-like string and doesn't contain timezone info, append 'Z' (UTC)
  let parsedString = dateString.trim();
  if (
    parsedString.includes("T") &&
    !parsedString.endsWith("Z") &&
    !/[+-]\d{2}:?\d{2}$/.test(parsedString)
  ) {
    parsedString = `${parsedString}Z`;
  } else if (
    !parsedString.includes("T") &&
    parsedString.includes(" ") &&
    !parsedString.endsWith("Z") &&
    !/[+-]\d{2}:?\d{2}$/.test(parsedString)
  ) {
    parsedString = `${parsedString.replace(" ", "T")}Z`;
  }
  return new Date(parsedString);
}

export function formatDate(dateString: string | Date, pattern: string = "MMM dd, yyyy hh:mm a") {
  if (!dateString) return "";
  const date = parseDate(dateString);
  if (isNaN(date.getTime())) return "";
  return format(date, pattern);
}

export function formatRelativeTime(dateString: string | Date) {
  if (!dateString) return "";
  const date = parseDate(dateString);
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getPriorityColor(priority: string) {
  const p = priority?.toLowerCase() || "";
  switch (p) {
    case "urgent":
      return "bg-red-50 text-red-700 border border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "low":
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
}

export function getStatusColor(status: string) {
  const s = status?.toLowerCase() || "";
  switch (s) {
    case "escalated":
    case "urgent":
      return "bg-red-50 text-red-700 border border-red-200";
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "pending":
    case "in_progress":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "open":
    default:
      return "bg-amber-50 text-amber-700 border border-amber-200";
  }
}

export function getSentimentColor(sentiment: string) {
  const s = sentiment?.toLowerCase() || "";
  switch (s) {
    case "positive":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "negative":
      return "bg-red-50 text-red-700 border border-red-200";
    case "neutral":
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
}

export function truncateText(text: string, maxLength: number = 60) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getSLAInfo(created_at: string, priority: string, status: string) {
  if (status === "resolved") {
    return { text: "Resolved", color: "text-emerald-700 bg-emerald-50/50 border-emerald-200", isOverdue: false };
  }
  
  let hoursLimit = 48; // low
  if (priority === "urgent") hoursLimit = 4;
  else if (priority === "high") hoursLimit = 12;
  else if (priority === "medium") hoursLimit = 24;
  
  const createdTime = new Date(created_at).getTime();
  const limitTime = createdTime + hoursLimit * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = limitTime - now;
  
  if (diffMs <= 0) {
    return { text: "Overdue", color: "text-red-700 bg-red-50 border-red-200 font-semibold animate-pulse border", isOverdue: true };
  }
  
  const diffHrs = Math.floor(diffMs / (3600 * 1000));
  const diffMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
  
  let text = "";
  if (diffHrs > 0) {
    text = `${diffHrs}h ${diffMins}m left`;
  } else {
    text = `${diffMins}m left`;
  }
  
  let color = "text-slate-600 bg-slate-50 border-slate-200 border";
  if (diffMs < 2 * 60 * 60 * 1000) {
    // Less than 2 hours left
    color = "text-amber-700 bg-amber-50 border-amber-200 font-semibold animate-pulse border";
  }
  
  return { text, color, isOverdue: false };
}

export function getAIPriorityScore(ticketId: string, priority: string, sentiment: string) {
  let baseScore = 30;
  if (priority === "urgent") baseScore = 90;
  else if (priority === "high") baseScore = 75;
  else if (priority === "medium") baseScore = 55;
  
  if (sentiment === "negative") baseScore += 8;
  else if (sentiment === "positive") baseScore -= 10;
  
  // Deterministic variation based on ticket ID hash
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    hash += ticketId.charCodeAt(i);
  }
  const variance = hash % 6; // returns 0 to 5
  
  return Math.min(100, Math.max(0, baseScore + variance));
}
