import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full text-left">
        {label && (
          <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-muted pointer-events-none [&_svg]:h-4 [&_svg]:w-4 z-10">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-lg border border-border bg-white py-2 pr-10 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none",
              icon ? "pl-10" : "pl-3.5",
              error && "border-danger focus:ring-danger focus:border-danger",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center justify-center">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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
Select.displayName = "Select";

export { Select };
