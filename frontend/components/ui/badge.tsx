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
          "bg-slate-50 text-slate-600 border-slate-200": variant === "default",
          "bg-emerald-50 text-emerald-700 border-emerald-200": variant === "success",
          "bg-amber-50 text-amber-700 border-amber-200": variant === "warning",
          "bg-red-50 text-red-700 border-red-200": variant === "danger",
          "bg-primary/10 text-primary border-primary/25": variant === "info",
          "bg-transparent text-text-muted border-border hover:text-text-primary": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
