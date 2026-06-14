"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
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
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    
    const root = window.document.documentElement;
    root.classList.remove("dark");

    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role === "customer") {
      router.replace("/portal");
    }
  }, [isAuthenticated, user, router, mounted]);

  if (!mounted || !hydrated || !isAuthenticated || user?.role === "customer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
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
        <main className={`flex-1 bg-background p-4 sm:p-6 relative ${pathname.includes("/tickets/") || pathname === "/chat" ? "overflow-hidden" : "overflow-y-auto"}`}>
          <ErrorBoundary>
            {/* Animated Page Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`page-transition flex flex-col ${pathname.includes("/tickets/") || pathname === "/chat" ? "h-full min-h-0" : "min-h-full"}`}
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
