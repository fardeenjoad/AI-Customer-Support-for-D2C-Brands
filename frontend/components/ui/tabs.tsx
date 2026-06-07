import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsList = ({ children, className, value, onValueChange }: TabsListProps) => {
  return (
    <div className={cn("inline-flex items-center justify-start rounded-lg bg-surface/50 p-1 border border-border", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeValue: value,
            onClick: () => onValueChange?.(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onClick?: () => void;
}

const TabsTrigger = ({ value, children, className, activeValue, onClick }: TabsTriggerProps) => {
  const isActive = activeValue === value;
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-surface text-text-primary border border-border shadow-sm"
          : "text-text-muted hover:text-text-primary hover:bg-surface/30",
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
}

const TabsContent = ({ value, children, className, activeValue }: TabsContentProps) => {
  if (activeValue !== value) return null;
  return (
    <div className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
