import { cn } from "@/lib/utils";

const variants = {
  waiting:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  called:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase() as keyof typeof variants;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[key] ?? "bg-zinc-100 text-zinc-800",
        className
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
