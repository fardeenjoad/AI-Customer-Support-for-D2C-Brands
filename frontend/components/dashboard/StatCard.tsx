"use client";

import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: keyof typeof LucideIcons;
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
  const IconComponent = LucideIcons[icon] as React.ComponentType<any>;
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

  // Glow configurations based on color prop
  const glowColors = {
    blue: "group-hover:border-primary/50 group-hover:shadow-primary/5",
    cyan: "group-hover:border-accent/50 group-hover:shadow-accent/5",
    emerald: "group-hover:border-success/50 group-hover:shadow-success/5",
    amber: "group-hover:border-warning/50 group-hover:shadow-warning/5",
    red: "group-hover:border-danger/50 group-hover:shadow-danger/5",
    purple: "group-hover:border-purple-500/50 group-hover:shadow-purple-500/5",
  };

  const iconTextColors = {
    blue: "text-primary group-hover:bg-primary/10",
    cyan: "text-accent group-hover:bg-accent/10",
    emerald: "text-success group-hover:bg-success/10",
    amber: "text-warning group-hover:bg-warning/10",
    red: "text-danger group-hover:bg-danger/10",
    purple: "text-purple-400 group-hover:bg-purple-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className={cn(
        "flex flex-col space-y-3 relative group overflow-hidden transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-glow",
        glowColors[color]
      )}>
        {/* Subtle interior glow filter */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-surface/40 pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between z-10">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-0.5 select-none">
            {title}
          </span>
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border/80 text-text-muted transition-all duration-300 shadow-sm shrink-0",
            iconTextColors[color]
          )}>
            {IconComponent && <IconComponent className="h-4.5 w-4.5" />}
          </div>
        </div>

        {/* Value Display */}
        <div className="text-2xl font-bold font-heading text-text-primary tracking-tight z-10 select-none">
          {displayValue}
        </div>

        {/* Trend Indicator and Description */}
        {(description || trendValue) && (
          <div className="flex items-center space-x-2 text-xs z-10 select-none">
            {trendValue && (
              <span
                className={cn(
                  "font-bold rounded px-1.5 py-0.5 text-[10px] flex items-center space-x-0.5",
                  trend === "up" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  trend === "down" && "bg-red-500/10 text-red-400 border border-red-500/20",
                  trend === "neutral" && "bg-border/60 text-text-muted border border-border/80"
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
