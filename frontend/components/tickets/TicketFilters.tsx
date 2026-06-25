import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
  statusCounts?: {
    all?: number;
    open?: number;
    pending?: number;
    resolved?: number;
    escalated?: number;
  };
}

const STATUS_CHIPS = [
  { value: "all", label: "All", tone: "text-slate-700" },
  { value: "open", label: "Open", tone: "text-amber-700" },
  { value: "in_progress", label: "Pending", tone: "text-slate-700" },
  { value: "resolved", label: "Resolved", tone: "text-emerald-700" },
] as const;

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
  statusCounts,
}: TicketFiltersProps) {
  const { useBrands } = useAnalytics();
  const { data: brandsRes } = useBrands({ limit: 100 });
  const brands = brandsRes?.data || [];

  return (
    <section className="rounded-lg border border-border bg-white p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by subject or ticket ID"
            icon={<Search className="h-4 w-4" />}
            className="h-10 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map((chip) => {
              const isActive = status === chip.value;
              const countKey = chip.value === "in_progress" ? "pending" : chip.value;
              const count = statusCounts?.[countKey as keyof typeof statusCounts];

              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => onStatusChange(chip.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-text-muted hover:border-slate-300 hover:text-text-primary"
                  )}
                >
                  <span className={isActive ? "text-primary" : chip.tone}>{chip.label}</span>
                  {typeof count === "number" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        isActive ? "bg-white text-primary" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(event) => onPriorityChange(event.target.value)}
            className="h-10 min-w-[150px] text-xs"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Escalated</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          <Select
            label="Brand"
            value={brand}
            onChange={(event) => onBrandChange(event.target.value)}
            className="h-10 min-w-[170px] max-w-[220px] text-xs"
          >
            <option value="all">All brands</option>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brand_name}
              </option>
            ))}
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 px-3 text-text-muted hover:bg-slate-100 hover:text-text-primary"
            title="Reset filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}
