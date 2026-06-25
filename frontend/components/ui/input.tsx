import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full text-left">
        {label && (
          <label className="text-[10px] text-text-muted font-medium tracking-[0.02em] uppercase pl-0.5">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-muted pointer-events-none [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-lg border border-border bg-white py-2 pr-3 text-sm text-text-primary placeholder:text-slate-400 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-10" : "pl-3.5",
              error && "border-danger focus:ring-danger focus:border-danger",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-danger font-medium pl-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
