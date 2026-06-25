"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Ticket,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
} from "lucide-react";

// Navigation item type
interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebarCollapse, isMobileSidebarOpen, setMobileSidebar } = useUiStore();
  
  // Fetch overdue alerts count for notification badge
  const { useGetAlerts } = useAnalytics();
  const { data: alertsRes } = useGetAlerts({ limit: 100 });
  const alertCount = alertsRes?.data?.length || 0;

  const role = user?.role || "agent";

  // Section 1: Main Workstation
  const mainItems: NavItem[] = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { label: "Human Handoff Queue", path: "/tickets", icon: Ticket },
    { label: "Live Conversations", path: "/chat", icon: MessageSquare },
  ];

  // Section 2: Administration & Config
  const managementItems: NavItem[] = [];
  if (role === "admin") {
    managementItems.push(
      { label: "Knowledge Base", path: "/brands", icon: BookOpen },
      { label: "Analytics", path: "/analytics", icon: BarChart3 }
    );
  } else if (role === "agent") {
    managementItems.push(
      { label: "Analytics", path: "/analytics", icon: BarChart3 }
    );
  }

  // Section 3: User Account
  const accountItems: NavItem[] = [
    { label: "Settings", path: "/settings", icon: Settings },
    { label: "Help Center", path: "/portal", icon: HelpCircle },
  ];

  const renderNavSection = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-1.5 mt-5 first:mt-0">
        {!isSidebarCollapsed && (
          <h4 className="text-[10px] text-text-muted/60 uppercase font-medium tracking-[0.02em] pl-3 select-none">
            {title}
          </h4>
        )}
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            const isTickets = item.label === "Human Handoff Queue";

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileSidebar(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/[0.08] text-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-light"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-all shrink-0",
                      isActive 
                        ? "text-primary" 
                        : "text-text-muted group-hover:text-text-primary group-hover:scale-105"
                    )}
                  />
                  {!isSidebarCollapsed && (
                    <span className="transition-opacity duration-200">{item.label}</span>
                  )}
                </div>

                {/* Tickets Notification Badge */}
                {isTickets && alertCount > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center font-mono font-bold rounded-full bg-danger/10 text-danger border border-danger/20 animate-pulse",
                    isSidebarCollapsed 
                      ? "absolute top-1.5 right-1.5 w-2 h-2 text-[0px]" 
                      : "px-1.5 py-0.5 text-[9px]"
                  )}>
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-border flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
            <LifeBuoy className="h-4 w-4" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-extrabold text-text-primary text-sm font-heading tracking-wide flex items-center whitespace-nowrap">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          )}
        </div>

        {/* Collapse button (Desktop Only) */}
        {!isMobileSidebarOpen && (
          <button
            onClick={toggleSidebarCollapse}
            className="p-1 rounded-md border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-background transition-colors max-md:hidden shrink-0"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-4 scrollbar-thin">
        {renderNavSection("Main Workstation", mainItems)}
        {renderNavSection("Management", managementItems)}
        {renderNavSection("User Account", accountItems)}
      </nav>

      {/* Profile and Logout Section */}
      <div className="p-3 border-t border-border bg-surface-light">
        <div className={cn(
          "flex items-center justify-between p-2 rounded-lg bg-white border border-border",
          isSidebarCollapsed ? "flex-col space-y-3 p-1" : "flex-row"
        )}>
          <div className="flex items-center space-x-2.5 overflow-hidden w-full">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold border border-primary/20 uppercase shrink-0">
              {user?.email?.slice(0, 2) || "AG"}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-medium text-text-primary truncate">
                  {user?.email || "Agent Mode"}
                </span>
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mt-0.5">
                  {role}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            title="Log out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Framer Motion width toggle) */}
      <motion.div
        animate={{ width: isSidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="h-screen border-r border-border bg-sidebar max-md:hidden shrink-0 z-40 relative"
      >
        {sidebarContent}
      </motion.div>

      {/* Mobile Drawer (Drawer slide-in with overlay backdrop) */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Slide-out drawer panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="relative w-64 h-full border-r border-border bg-sidebar flex flex-col z-50"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
