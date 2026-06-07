import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1 w-full">
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus:ring-danger focus:border-danger",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
