import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all duration-200",
        {
          "bg-border/50 text-text-primary border-border": variant === "default",
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": variant === "success",
          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20": variant === "warning",
          "bg-red-500/10 text-red-400 border-red-500/20": variant === "danger",
          "bg-blue-500/10 text-blue-400 border-blue-500/20": variant === "info",
          "bg-transparent text-text-muted border-border hover:text-text-primary": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
