"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { X, Zap, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTickets } from "@/hooks/useTickets";
import { useAnalytics } from "@/hooks/useAnalytics";
import { createPortal } from "react-dom";

// ── Zod Schema ──
const createTicketSchema = zod.object({
  subject: zod
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(120, "Subject must be under 120 characters"),
  initial_message: zod
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be under 2000 characters"),
  brand_id: zod.string().min(1, "Brand selection is required"),
});

type CreateTicketFormData = zod.infer<typeof createTicketSchema>;

interface CreateTicketPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketPanel({ isOpen, onClose }: CreateTicketPanelProps) {
  const { createTicket, isCreating } = useTickets();
  const { useBrands } = useAnalytics();
  const { data: brandsRes } = useBrands({ limit: 100 });
  const brands = brandsRes?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      initial_message: "",
      brand_id: "",
    },
  });

  const descValue = watch("initial_message") || "";

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const onSubmit = async (data: CreateTicketFormData) => {
    try {
      await createTicket(data);
      reset();
      onClose();
    } catch {
      // toast handled in hook
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg h-full bg-surface border-l border-border shadow-2xl z-10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-heading text-text-primary">
                    Create Ticket
                  </h2>
                  <p className="text-[10px] text-text-muted">
                    Open a new support ticket in the queue
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary/40 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <div className="flex-1 px-6 py-6 space-y-5">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Order #1234 not received"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                    {...register("subject")}
                  />
                  {errors.subject && (
                    <span className="text-xs text-danger font-medium pl-0.5">
                      {errors.subject.message}
                    </span>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                    D2C Brand
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer appearance-none"
                    {...register("brand_id")}
                  >
                    <option value="">Select a brand...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                  {errors.brand_id && (
                    <span className="text-xs text-danger font-medium pl-0.5">
                      {errors.brand_id.message}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
                      Description
                    </label>
                    <span className="text-[10px] text-text-muted">
                      {descValue.length}/2000
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Describe the issue in detail..."
                    className="flex w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
                    {...register("initial_message")}
                  />
                  {errors.initial_message && (
                    <span className="text-xs text-danger font-medium pl-0.5">
                      {errors.initial_message.message}
                    </span>
                  )}
                </div>

                {/* Info note */}
                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start space-x-2.5">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    AI will automatically classify the priority and sentiment of
                    this ticket upon creation.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isCreating}
                  className="min-w-[120px]"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Submit Ticket
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

