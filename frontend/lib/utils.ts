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
