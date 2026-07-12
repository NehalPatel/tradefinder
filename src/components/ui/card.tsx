import { cn } from "@/lib/utils";

export function Card({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border bg-surface p-1",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h2>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-1 pb-1">{children}</div>
    </section>
  );
}
