"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Ticket, ArrowRight, X, Clock, Settings, ShieldAlert, Tag } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useTickets } from "@/hooks/useTickets";
import { getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function SearchPalette() {
  const router = useRouter();
  const { isSearchOpen, setSearchOpen } = useUiStore();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { useListTickets } = useTickets();
  const { data: ticketsRes } = useListTickets({ limit: 100 });
  const tickets = ticketsRes?.data || [];

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("resolveiq-recent-searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error("Failed parsing recent searches", e);
        }
      } else {
        // Seed default recent searches
        const defaults = ["refund", "order issue", "cancel subscription"];
        setRecentSearches(defaults);
        localStorage.setItem("resolveiq-recent-searches", JSON.stringify(defaults));
      }
    }
  }, [isSearchOpen]);

  // Handle shortcut listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  // Word-based fuzzy query filter
  const fuzzyMatch = (text: string, queryStr: string) => {
    const cleanText = text.toLowerCase();
    const cleanQuery = queryStr.toLowerCase().trim();
    if (!cleanQuery) return true;
    
    // Check if all space-separated search words are present in text
    const words = cleanQuery.split(/\s+/);
    return words.every(word => cleanText.includes(word));
  };

  const filteredTickets = query.trim()
    ? tickets.filter((t) =>
        fuzzyMatch(t.subject, query) || fuzzyMatch(t.id, query)
      ).slice(0, 6)
    : tickets.slice(0, 4); // show recent ones by default

  const handleNavigate = (path: string) => {
    // Save current query to recent searches if matching tickets exist
    if (query.trim()) {
      const nextRecent = [
        query.trim(),
        ...recentSearches.filter((q) => q.toLowerCase() !== query.trim().toLowerCase())
      ].slice(0, 5);
      setRecentSearches(nextRecent);
      localStorage.setItem("resolveiq-recent-searches", JSON.stringify(nextRecent));
    }
    
    router.push(path);
    setSearchOpen(false);
    setQuery("");
  };

  const selectRecentSearch = (searchStr: string) => {
    setQuery(searchStr);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("resolveiq-recent-searches");
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col text-left z-50 mx-4"
          >
            {/* Input Header */}
            <div className="flex items-center border-b border-border/80 px-4 h-12">
              <Search className="h-5 w-5 text-text-muted mr-3 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search tickets by subject or ID..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder-text-muted py-2 focus:ring-0"
                autoFocus
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface/60 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto max-h-[320px] p-2 space-y-1.5 scrollbar-thin">
              {/* Category: Navigation shortcuts */}
              {query === "" && (
                <div className="p-2">
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider pl-1">
                    Quick Navigation
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => handleNavigate("/tickets")}
                      className="flex items-center space-x-2.5 p-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-surface/50 text-xs text-text-primary text-left transition-colors"
                    >
                      <Ticket className="h-4 w-4 text-primary" />
                      <span>View All Tickets</span>
                    </button>
                    <button
                      onClick={() => handleNavigate("/settings")}
                      className="flex items-center space-x-2.5 p-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-surface/50 text-xs text-text-primary text-left transition-colors"
                    >
                      <Settings className="h-4 w-4 text-accent" />
                      <span>Workstation Settings</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Category: Recent Searches (if empty query) */}
              {query === "" && recentSearches.length > 0 && (
                <div className="p-2 border-t border-border/40 mt-1">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Recent Searches</span>
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[9px] font-semibold text-text-muted hover:text-danger hover:underline transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => selectRecentSearch(search)}
                        className="px-2.5 py-1 rounded-md bg-surface border border-border/80 hover:border-primary/40 hover:bg-surface/50 text-[10px] text-text-primary transition-colors flex items-center space-x-1"
                      >
                        <Clock className="h-2.5 w-2.5 text-text-muted" />
                        <span>{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Support Tickets */}
              <div className="p-2 border-t border-border/40 mt-1">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider pl-1">
                  {query === "" ? "Recent Tickets" : "Matching Support Tickets"}
                </span>
                <div className="space-y-1.5 mt-2">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center text-xs text-text-muted py-6">
                      No matching tickets found.
                    </div>
                  ) : (
                    filteredTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleNavigate(`/tickets/${t.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-surface/50 cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className="w-8 h-8 rounded-lg bg-surface border border-border/60 flex items-center justify-center text-text-muted shrink-0">
                            <Ticket className="h-4 w-4 text-glow" />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-xs font-semibold text-text-primary truncate">
                              {t.subject}
                            </span>
                            <span className="text-[10px] text-text-muted truncate mt-0.5">
                              ID: {t.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <Badge className={`${getStatusColor(t.status)} text-[9px] px-1.5`}>
                            {t.status}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Status */}
            <div className="h-9 border-t border-border/60 bg-surface/80 flex items-center justify-between px-4 text-[10px] text-text-muted select-none">
              <div className="flex items-center space-x-1">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                <span>Escalations scan active</span>
              </div>
              <div className="flex items-center space-x-3">
                <span><kbd className="bg-background px-1 py-0.5 rounded border border-border/50 font-mono">ESC</kbd> to close</span>
                <span><kbd className="bg-background px-1 py-0.5 rounded border border-border/50 font-mono">↵</kbd> select</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
