"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Check, Trash2, Calendar, Menu, Moon, Sun, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { cn, formatDate } from "@/lib/utils";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleMobileSidebar, setSearchOpen } = useUiStore();

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Parse path breadcrumbs
  const getBreadcrumbs = () => {
    if (pathname === "/dashboard") return ["Workspace", "Overview"];
    const parts = pathname.split("/").filter(Boolean);
    return ["Workspace", ...parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1))];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
      {/* Left side: Hamburger (Mobile) + Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleMobileSidebar}
          className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary md:hidden transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-text-muted/60">/</span>}
              <span
                className={cn(
                  idx === breadcrumbs.length - 1
                    ? "text-text-primary font-semibold font-heading"
                    : "text-text-muted/80"
                )}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        {/* Clickable Search Input triggering CMD+K */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center bg-surface border border-border/80 hover:border-primary/45 rounded-lg px-3 py-1.5 w-60 max-sm:w-36 text-text-muted hover:text-text-primary transition-all duration-200"
        >
          <Search className="h-4 w-4 shrink-0 mr-2" />
          <span className="text-[11px] text-left flex-1 truncate">Search tickets (⌘K)...</span>
          <kbd className="bg-background px-1.5 py-0.5 rounded text-[8px] border border-border font-mono max-sm:hidden">
            ⌘K
          </kbd>
        </button>

        {/* Calendar Widget Display (Desktop Only) */}
        <div className="flex items-center text-[10px] font-bold text-text-muted uppercase tracking-wider space-x-2 bg-surface/40 px-3 py-1.5 rounded-lg border border-border/50 max-lg:hidden">
          <Calendar className="h-3.5 w-3.5" />
          <span>June 06, 2026</span>
        </div>

        {/* Theme mode is locked to Sand + Teal light theme */}

        {/* Notifications Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-surface border border-border/80 text-text-muted hover:text-text-primary transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 text-left"
              >
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80">
                  <h4 className="text-xs font-semibold text-text-primary font-heading">
                    Notifications ({unreadCount})
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => markAllAsRead()}
                      className="p-1 rounded hover:bg-border text-text-muted hover:text-text-primary transition-colors"
                      title="Mark all as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => clearNotifications()}
                      className="p-1 rounded hover:bg-border text-text-muted hover:text-danger transition-colors"
                      title="Clear all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.ticketId) {
                            router.push(`/tickets/${notif.ticketId}`);
                            setShowNotifications(false);
                          }
                        }}
                        className={cn(
                          "p-3.5 text-left transition-colors cursor-pointer hover:bg-surface/60",
                          !notif.read ? "bg-primary/5" : "bg-transparent"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              notif.type === "error" && "text-danger",
                              notif.type === "warning" && "text-warning",
                              notif.type === "success" && "text-success",
                              notif.type === "info" && "text-primary"
                            )}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[9px] text-text-muted">
                            {formatDate(notif.timestamp, "hh:mm a")}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center space-x-2 p-1 rounded-lg border border-transparent hover:border-border hover:bg-surface transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
              {user?.email?.slice(0, 2) || "AG"}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted hover:text-text-primary max-sm:hidden transition-transform" style={{ transform: showUserDropdown ? "rotate(180deg)" : "rotate(0)" }} />
          </button>

          <AnimatePresence>
            {showUserDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 text-left"
              >
                <div className="p-3 bg-surface/80 border-b border-border/80 flex flex-col space-y-0.5">
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {user?.email || "Agent Mode"}
                  </span>
                  <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-0.5">
                    Role: {user?.role || "Agent"}
                  </span>
                </div>
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      router.push("/settings");
                      setShowUserDropdown(false);
                    }}
                    className="flex w-full items-center space-x-2.5 px-3 py-2 text-xs rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/portal");
                      setShowUserDropdown(false);
                    }}
                    className="flex w-full items-center space-x-2.5 px-3 py-2 text-xs rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
                  >
                    <User className="h-4 w-4" />
                    <span>Customer Portal</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="flex w-full items-center space-x-2.5 px-3 py-2 text-xs rounded-lg text-danger hover:bg-danger/10 transition-all border-t border-border/40 mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
