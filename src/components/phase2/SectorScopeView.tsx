"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { tradingViewUrl } from "@/components/SymbolLink";
import { formatNumber, formatPct, cn } from "@/lib/utils";
import type {
  SectorScopeResponse,
  SectorStockRow,
  SectorSummary,
} from "@/lib/phase2-types";

async function fetchSectorScope(): Promise<SectorScopeResponse> {
  const res = await fetch("/api/sector-scope", { cache: "no-store" });
  if (!res.ok) throw new Error(`Sector scope HTTP ${res.status}`);
  return res.json();
}

function heatColor(changePercent: number): string {
  if (changePercent >= 3) return "#15803d";
  if (changePercent >= 1.5) return "#16a34a";
  if (changePercent >= 0.4) return "#22c55e";
  if (changePercent > -0.4) return "#52525b";
  if (changePercent > -1.5) return "#ef4444";
  if (changePercent > -3) return "#dc2626";
  return "#b91c1c";
}

/** Weighted tile size from turnover — keeps layout readable. */
function tileFlex(stock: SectorStockRow, minTurnover: number): number {
  const base = Math.max(stock.turnover, stock.ltp * 1000, 1);
  return Math.max(1, Math.sqrt(base / Math.max(minTurnover, 1)));
}

function SectorHeatPanel({ sector }: { sector: SectorSummary }) {
  const stocks = sector.stocks ?? [];
  const minTo = useMemo(() => {
    if (!stocks.length) return 1;
    return Math.min(...stocks.map((s) => Math.max(s.turnover, 1)));
  }, [stocks]);

  if (!stocks.length) return null;

  return (
    <section className="flex min-h-[200px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => scrollToSectorTable(sector.sector)}
          className="text-left text-xs font-bold uppercase tracking-wider text-white hover:text-bull-text"
          title={`Jump to ${sector.sector} table`}
        >
          {sector.sector}
        </button>
        <span
          className={cn(
            "text-[11px] font-semibold tabular-nums",
            sector.avgChangePercent >= 0 ? "text-bull-text" : "text-bear-text",
          )}
        >
          {formatPct(sector.avgChangePercent)} · {stocks.length} stocks
        </span>
      </header>
      <div className="flex min-h-[160px] flex-1 flex-wrap content-stretch gap-0.5 bg-[#0e0f15] p-0.5">
        {stocks.map((st) => {
          const flex = tileFlex(st, minTo);
          return (
            <a
              key={st.symbol}
              href={tradingViewUrl(st.symbol)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${st.symbol} ${formatPct(st.changePercent)}`}
              className="flex min-h-[52px] min-w-[72px] flex-col items-center justify-center px-1.5 py-1 transition-opacity hover:opacity-90"
              style={{
                flexGrow: flex,
                flexBasis: `${Math.min(160, 56 + flex * 28)}px`,
                backgroundColor: heatColor(st.changePercent),
              }}
            >
              <span className="max-w-full truncate text-center text-[11px] font-bold leading-tight text-white">
                {st.symbol}
              </span>
              <span className="text-center text-[10px] font-semibold tabular-nums text-white">
                {formatPct(st.changePercent)}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function SectorHeatmaps({ sectors }: { sectors: SectorSummary[] }) {
  const withStocks = sectors.filter((s) => (s.stocks?.length ?? 0) > 0);

  if (!withStocks.length) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-border bg-surface text-xs text-muted">
        Waiting for live sector quotes…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {withStocks.map((s) => (
        <SectorHeatPanel key={s.sector} sector={s} />
      ))}
    </div>
  );
}

function sectorAnchorId(sector: string): string {
  return `sector-table-${sector.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function scrollToSectorTable(sector: string) {
  const el = document.getElementById(sectorAnchorId(sector));
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("ring-2", "ring-bull-text/60");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-bull-text/60");
  }, 1200);
}

function SectorPerformanceChart({ sectors }: { sectors: SectorSummary[] }) {
  const rows = [...sectors]
    .filter((s) => Number.isFinite(s.avgChangePercent) && s.avgChangePercent !== 0)
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent)
    .map((s) => ({
      sector: s.sector.length > 12 ? s.sector.slice(0, 11) + "…" : s.sector,
      full: s.sector,
      avg: Number(s.avgChangePercent.toFixed(2)),
    }));

  if (!rows.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-border bg-surface text-xs text-muted">
        No sector performance data yet
      </div>
    );
  }

  return (
    <div className="h-[300px] rounded-lg border border-border bg-surface p-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white">
        Sector Scope — Bull &amp; Bear
      </h3>
      <p className="mb-2 text-[10px] text-muted">
        Click a column to jump to that sector table
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
          <XAxis
            dataKey="sector"
            tick={{ fill: "#ffffff", fontSize: 10 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: "#ffffff", fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1b1c24",
              border: "1px solid #2a2b36",
              borderRadius: 6,
              fontSize: 12,
              color: "#ffffff",
            }}
            formatter={(value) => [`${value}%`, "Avg %"]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { full?: string })?.full ?? ""
            }
          />
          <Bar
            dataKey="avg"
            radius={[3, 3, 0, 0]}
            cursor="pointer"
            onClick={(data) => {
              const full =
                (data as { full?: string; payload?: { full?: string } })?.full ??
                (data as { payload?: { full?: string } })?.payload?.full;
              if (full) scrollToSectorTable(full);
            }}
          >
            {rows.map((entry) => (
              <Cell
                key={entry.full}
                fill={entry.avg >= 0 ? "#22c55e" : "#ef4444"}
                cursor="pointer"
                onClick={() => scrollToSectorTable(entry.full)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChgPill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex min-w-[4.25rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white",
        up ? "bg-[#16a34a]" : "bg-[#dc2626]",
      )}
    >
      {formatPct(value)}
    </span>
  );
}

function SectorCard({
  sector,
  asOfTime,
}: {
  sector: SectorSummary;
  asOfTime: string;
}) {
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const advRatio =
    sector.stockCount > 0 ? sector.advancers / sector.stockCount : 0.5;

  const rows = useMemo(() => {
    const list = sector.stocks ?? sector.leaders ?? [];
    if (!query.trim()) return list;
    const q = query.trim().toUpperCase();
    return list.filter((s) => s.symbol.includes(q));
  }, [sector, query]);

  return (
    <section
      id={sectorAnchorId(sector.sector)}
      className="flex min-h-[280px] scroll-mt-4 flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow"
    >
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, #16a34a 0%, #16a34a ${advRatio * 100}%, #dc2626 ${advRatio * 100}%, #dc2626 100%)`,
        }}
      />
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          {sector.sector}
        </h3>
        <span className="text-[10px] text-muted">
          {formatPct(sector.avgChangePercent)} · {sector.advancers}/
          {sector.decliners}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className="rounded p-1 text-muted hover:bg-border/40 hover:text-white"
            aria-label="Search sector"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Live
            <span
              role="switch"
              aria-checked={live}
              tabIndex={0}
              onClick={() => setLive((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLive((v) => !v);
                }
              }}
              className={cn(
                "relative h-4 w-7 rounded-full transition-colors",
                live ? "bg-bull-text" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                  live ? "left-3.5" : "left-0.5",
                )}
              />
            </span>
          </label>
        </div>
      </header>
      {showSearch && (
        <div className="border-b border-border px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter symbol…"
            className="w-full rounded border border-border bg-[#12131a] px-2 py-1 text-xs text-white outline-none focus:border-muted"
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 text-right font-medium">LTP</th>
              <th className="px-3 py-2 text-right font-medium">Chg %</th>
              <th className="px-3 py-2 text-right font-medium">Time</th>
              <th className="px-3 py-2 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  No stocks in this sector
                </td>
              </tr>
            ) : (
              rows.map((r: SectorStockRow, i) => {
                const up = r.changePercent >= 0;
                return (
                  <tr
                    key={r.symbol}
                    className={cn(
                      "border-b border-border/50",
                      i % 2 === 1 && "bg-[#16171f]",
                      !live && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-2">
                      <a
                        href={tradingViewUrl(r.symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-bull-text"
                      >
                        {r.symbol}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white">
                      {formatNumber(r.ltp)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ChgPill value={r.changePercent} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {asOfTime}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {up ? (
                        <ArrowUp className="ml-auto h-3.5 w-3.5 text-bull-text" />
                      ) : (
                        <ArrowDown className="ml-auto h-3.5 w-3.5 text-bear-text" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function extractTime(asOf?: string): string {
  if (!asOf) return "--:--:--";
  const match = asOf.match(/(\d{1,2}:\d{2}:\d{2})/);
  return match?.[1] ?? asOf.slice(-8);
}

export function SectorScopeView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["sector-scope"],
    queryFn: fetchSectorScope,
    refetchInterval: 20_000,
  });

  const sectors = data?.sectors ?? [];
  const asOfTime = extractTime(data?.asOf);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Sector Scope"
        subtitle="Per-sector heatmaps, gainers chart, and live boards"
        asOf={data?.asOf}
        marketStatus={data?.marketStatus}
        quotesFetched={data?.quotesFetched}
        isLoading={isLoading}
        isFetching={isFetching}
        error={
          isError
            ? error instanceof Error
              ? error.message
              : "Feed error"
            : data?.error
        }
      />

      <div className="mb-5 space-y-5 md:space-y-6">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Sector Heatmaps
          </h2>
          <SectorHeatmaps sectors={sectors} />
        </div>
        <SectorPerformanceChart sectors={sectors} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {sectors.map((s) => (
          <SectorCard key={s.sector} sector={s} asOfTime={asOfTime} />
        ))}
      </div>

      {!isLoading && sectors.length === 0 && (
        <p className="mt-6 text-center text-xs text-muted">
          No sector data returned from the live feed.
        </p>
      )}
    </div>
  );
}
