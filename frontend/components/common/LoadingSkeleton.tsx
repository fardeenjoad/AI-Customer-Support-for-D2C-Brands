import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className }: SkeletonProps) {
  return (
    <div className={cn("h-4 rounded bg-border/40 shimmer-wrapper", className)} />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5 w-full", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-3.5 rounded bg-border/30 shimmer-wrapper", {
            "w-full": i < lines - 1,
            "w-2/3": i === lines - 1,
          })}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return (
    <div className={cn("h-10 w-10 rounded-full bg-border/40 shimmer-wrapper shrink-0", className)} />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card rounded-xl p-6 space-y-4", className)}>
      <div className="h-5 w-1/3 rounded bg-border/50 shimmer-wrapper" />
      <div className="space-y-2.5">
        <div className="h-3.5 w-full rounded bg-border/30 shimmer-wrapper" />
        <div className="h-3.5 w-5/6 rounded bg-border/30 shimmer-wrapper" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden border border-border rounded-xl bg-surface/20 p-4 space-y-4", className)}>
      <div className="flex space-x-4 border-b border-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-border/50 shimmer-wrapper" />
        ))}
      </div>
      <div className="space-y-3.5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex space-x-4 py-1">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 flex-1 rounded bg-border/30 shimmer-wrapper" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonProps) {
  return (
    <div className={cn("border border-border rounded-xl bg-surface/25 p-6 space-y-6 flex flex-col justify-between h-[280px]", className)}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-1/4 rounded bg-border/50 shimmer-wrapper" />
        <div className="h-4 w-16 rounded bg-border/40 shimmer-wrapper" />
      </div>
      
      {/* Visual Chart Bars */}
      <div className="flex items-end justify-between space-x-3 h-40 pt-4">
        <div className="w-full h-[30%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[65%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[45%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[85%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[50%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[70%] rounded bg-border/30 shimmer-wrapper" />
        <div className="w-full h-[40%] rounded bg-border/30 shimmer-wrapper" />
      </div>

      <div className="flex justify-between border-t border-border/40 pt-2 text-[10px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3 w-8 rounded bg-border/40 shimmer-wrapper" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonChatBubble({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-start space-x-3 max-w-[70%] my-4", className)}>
      <SkeletonAvatar className="h-8 w-8" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-16 rounded bg-border/40 shimmer-wrapper" />
        <div className="h-10 w-48 rounded-2xl bg-border/30 shimmer-wrapper rounded-tl-sm" />
      </div>
    </div>
  );
}
