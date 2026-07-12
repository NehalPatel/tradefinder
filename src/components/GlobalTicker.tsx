"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPct } from "@/lib/utils";
import type { TickerItem } from "@/lib/types";

async function fetchTicker(): Promise<{ items: TickerItem[]; asOf: string }> {
  const res = await fetch("/api/ticker", { cache: "no-store" });
  if (!res.ok) throw new Error("Ticker feed unavailable");
  return res.json();
}

function TickerChip({ item }: { item: TickerItem }) {
  const up = item.changePercent >= 0;
  return (
    <span className="mx-4 inline-flex items-center gap-2 whitespace-nowrap text-xs">
      <span className="font-medium text-foreground">{item.name}</span>
      <span className="tabular-nums text-muted">
        {item.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </span>
      <span
        className={`tabular-nums ${up ? "text-bull-text" : "text-bear-text"}`}
      >
        {up ? "↑" : "↓"} {formatPct(item.changePercent)}
      </span>
    </span>
  );
}

export function GlobalTicker() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["global-ticker"],
    queryFn: fetchTicker,
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex h-9 items-center overflow-hidden border-b border-border bg-[#0e0f15]">
      {isLoading && (
        <p className="px-4 text-xs text-muted">Loading live global quotes…</p>
      )}
      {isError && (
        <p className="px-4 text-xs text-bear-text">
          Global ticker unavailable — check network / Yahoo feed
        </p>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className="px-4 text-xs text-muted">No ticker quotes returned</p>
      )}
      {items.length > 0 && (
        <div className="flex w-max animate-marquee">
          {[...items, ...items].map((item, i) => (
            <TickerChip key={`${item.symbol}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
