"use client";

export function PageHeader({
  title,
  subtitle,
  asOf,
  marketStatus,
  quotesFetched,
  isLoading,
  isFetching,
  error,
}: {
  title: string;
  subtitle?: string;
  asOf?: string;
  marketStatus?: string;
  quotesFetched?: number;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
}) {
  const statusLabel =
    marketStatus === "open"
      ? "Market Open"
      : marketStatus === "preopen"
        ? "Pre-Open"
        : marketStatus === "closed"
          ? "Market Closed"
          : marketStatus
            ? marketStatus
            : undefined;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
      <div className="mr-auto">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
      </div>
      {statusLabel && (
        <span
          className={
            marketStatus === "open"
              ? "rounded bg-bull-bg px-2 py-0.5 text-bull-text"
              : "rounded bg-border/50 px-2 py-0.5"
          }
        >
          {isLoading ? "Connecting…" : statusLabel}
        </span>
      )}
      {typeof quotesFetched === "number" && (
        <span>Quotes {quotesFetched}</span>
      )}
      {asOf && <span>As of {asOf} IST</span>}
      {isFetching && !isLoading && <span>Refreshing…</span>}
      {error && <span className="text-bear-text">{error}</span>}
    </div>
  );
}
