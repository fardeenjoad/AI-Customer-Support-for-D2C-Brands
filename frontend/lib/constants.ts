export const API_ROUTES = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
  },
  tickets: {
    base: "/tickets",
    detail: (id: string) => `/tickets/${id}`,
    attachments: (id: string) => `/tickets/${id}/attachments`,
  },
  chat: {
    base: "/chat",
    history: (ticketId: string) => `/chat/${ticketId}/history`,
  },
  admin: {
    tickets: "/admin/tickets",
    assign: "/admin/assign",
    analytics: "/admin/analytics",
    alerts: "/admin/alerts",
    brands: "/admin/brands",
    brandDetail: (id: string) => `/admin/brands/${id}`,
  },
};

export const ROLES = {
  ADMIN: "admin",
  AGENT: "agent",
  CUSTOMER: "customer",
} as const;

export const TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
} as const;

export const TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const SENTIMENT = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
} as const;

export const BRAND_TONE = {
  FORMAL: "formal",
  CASUAL: "casual",
} as const;

export const NAVIGATION_ITEMS = {
  admin: [
    { label: "Overview", path: "/dashboard", icon: "LayoutDashboard" },
    { label: "Tickets Queue", path: "/tickets", icon: "Ticket" },
    { label: "Live Support", path: "/chat", icon: "MessageSquare" },
    { label: "Analytics Reports", path: "/analytics", icon: "BarChart3" },
    { label: "D2C Brands", path: "/brands", icon: "Building2" },
    { label: "Settings", path: "/settings", icon: "Settings" },
  ],
  agent: [
    { label: "Overview", path: "/dashboard", icon: "LayoutDashboard" },
    { label: "Tickets Queue", path: "/tickets", icon: "Ticket" },
    { label: "Live Support", path: "/chat", icon: "MessageSquare" },
    { label: "Settings", path: "/settings", icon: "Settings" },
  ],
};
