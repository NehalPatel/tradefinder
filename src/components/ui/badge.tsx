import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "bull" | "bear" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
        variant === "bull" && "bg-bull-bg text-bull-text",
        variant === "bear" && "bg-bear-bg text-bear-text",
        variant === "neutral" && "bg-border/60 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
