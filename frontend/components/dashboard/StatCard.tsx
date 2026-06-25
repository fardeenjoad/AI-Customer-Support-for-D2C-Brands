"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Icon, IconName } from "@/components/ui/icon";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: IconName;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  isLoading?: boolean;
  color?: "blue" | "cyan" | "emerald" | "amber" | "red" | "purple";
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend = "neutral",
  trendValue,
  isLoading,
  color = "blue",
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  // Animated counter on mount for numeric values
  useEffect(() => {
    if (isLoading) return;

    const strVal = String(value);
    const numPart = parseFloat(strVal.replace(/[^0-9.]/g, ""));
    
    if (isNaN(numPart)) {
      setDisplayValue(value);
      return;
    }

    const suffix = strVal.replace(/[0-9.]/g, "").trim();
    let start = 0;
    const duration = 1.2; // seconds
    const totalSteps = 40;
    const stepTime = (duration * 1000) / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = start + ((numPart - start) * step) / totalSteps;
      
      // Handle decimal float or integer count formatting
      const formatted = numPart % 1 === 0 
        ? Math.floor(current).toLocaleString()
        : current.toFixed(1);

      setDisplayValue(suffix ? `${formatted} ${suffix}` : formatted);

      if (step >= totalSteps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, isLoading]);

  if (isLoading) {
    return (
      <Card className="animate-pulse space-y-4 border-border/80 bg-surface/50">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-border/50" />
          <div className="h-8 w-8 rounded-lg bg-border/40" />
        </div>
        <div className="h-8 w-16 rounded bg-border/60" />
        <div className="h-3 w-32 rounded bg-border/40" />
      </Card>
    );
  }

  const cardAccent = {
    blue: "",
    cyan: "",
    emerald: "",
    amber: "",
    red: "",
    purple: "",
  };

  const iconTextColors = {
    blue: "text-primary bg-primary/5 border-primary/15",
    cyan: "text-primary bg-primary/5 border-primary/15",
    emerald: "text-primary bg-primary/5 border-primary/15",
    amber: "text-primary bg-primary/5 border-primary/15",
    red: "text-primary bg-primary/5 border-primary/15",
    purple: "text-primary bg-primary/5 border-primary/15",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className={cn(
        "flex flex-col space-y-3 relative group overflow-hidden transition-colors duration-150 hover:border-border",
        cardAccent[color]
      )}>
        <div className="flex items-center justify-between z-10">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-[0.02em] pl-0.5 select-none">
            {title}
          </span>
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 shrink-0",
            iconTextColors[color]
          )}>
            <Icon name={icon} className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Value Display */}
        <div className="text-2xl font-semibold font-heading text-text-primary tracking-tight z-10 select-none tabular-nums">
          {displayValue}
        </div>

        {/* Trend Indicator and Description */}
        {(description || trendValue) && (
          <div className="flex items-center space-x-2 text-xs z-10 select-none">
            {trendValue && (
              <span
                className={cn(
                  "font-bold rounded px-1.5 py-0.5 text-[10px] flex items-center space-x-0.5",
                  trend === "up" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  trend === "down" && "bg-red-50 text-red-700 border border-red-200",
                  trend === "neutral" && "bg-slate-50 text-text-muted border border-border"
                )}
              >
                {trend === "up" && <ArrowUpRight className="h-3 w-3 shrink-0" />}
                {trend === "down" && <ArrowDownRight className="h-3 w-3 shrink-0" />}
                {trend === "neutral" && <Minus className="h-3 w-3 shrink-0" />}
                <span>{trendValue}</span>
              </span>
            )}
            {description && (
              <span className="text-[10px] font-medium text-text-muted truncate">
                {description}
              </span>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
