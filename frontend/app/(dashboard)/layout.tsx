"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import SearchPalette from "@/components/dashboard/SearchPalette";
import SupportChatWidget from "@/components/dashboard/SupportChatWidget";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { theme } = useUiStore();
  const [mounted, setMounted] = useState(false);

  // Synchronize authentication and theme configurations
  useEffect(() => {
    setMounted(true);
    
    // Add theme class to document element on mount
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role === "customer") {
      router.replace("/portal");
    }
  }, [isAuthenticated, user, router, theme]);

  if (!mounted || !isAuthenticated || user?.role === "customer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Search Command Palette CMD+K overlay */}
      <SearchPalette />

      {/* Interactive Support Chat Widget (D2C Simulator) */}
      <SupportChatWidget />

      {/* Navigation Sidebar (Collapsible) */}
      <Sidebar />

      {/* Main workstation */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Navigation Topbar */}
        <Topbar />

        {/* Content pane */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/10 relative">
          <ErrorBoundary>
            {/* Animated Page Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="page-transition min-h-full flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
