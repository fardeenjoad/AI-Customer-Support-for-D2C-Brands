import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Icon, IconName } from "@/components/ui/icon";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-surface/30 border border-border/60 max-w-md mx-auto my-12"
    >
      <motion.div
        whileHover={{ scale: 1.06, rotate: 2 }}
        className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border text-text-muted mb-5 shadow-sm"
      >
        <Icon name={icon} className="h-6 w-6 text-primary" />
      </motion.div>
      <h3 className="text-base font-bold text-text-primary mb-2 font-heading tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-text-muted mb-6 leading-relaxed max-w-xs">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="border-primary text-primary hover:bg-primary/5 h-9 rounded-lg px-4"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
