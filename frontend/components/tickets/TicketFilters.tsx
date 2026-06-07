import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";

interface TicketFiltersProps {
  status: string;
  priority: string;
  brand: string;
  search: string;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onBrandChange: (brand: string) => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
}

export function TicketFilters({
  status,
  priority,
  brand,
  search,
  onStatusChange,
  onPriorityChange,
  onBrandChange,
  onSearchChange,
  onReset,
}: TicketFiltersProps) {
  // Fetch brand configs for brand filters
  const { useBrands } = useAnalytics();
  const { data: brandsRes } = useBrands({ limit: 100 });
  const brands = brandsRes?.data || [];

  return (
    <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between border border-border/80 bg-surface/30">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by subject or ID..."
          className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3.5 items-center">
        {/* Status */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Priority */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* D2C Brand */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">
            D2C Brand
          </label>
          <select
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer max-w-[160px]"
          >
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.brand_name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Trigger */}
        <div className="flex flex-col justify-end h-[38px] pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2.5 text-text-muted hover:text-danger hover:bg-danger/10 flex items-center space-x-1.5"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-[11px]">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
