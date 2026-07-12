"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Treemap,
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
  if (changePercent > -0.4) return "#3f3f46";
  if (changePercent > -1.5) return "#ef4444";
  if (changePercent > -3) return "#dc2626";
  return "#b91c1c";
}

type HeatNode = {
  name: string;
  size: number;
  changePercent?: number;
  children?: HeatNode[];
};

function buildHeatData(sectors: SectorSummary[]): HeatNode[] {
  return sectors
    .filter((s) => s.stocks.length > 0)
    .map((s) => ({
      name: s.sector.toUpperCase(),
      size: Math.max(s.totalTurnover, 1),
      changePercent: s.avgChangePercent,
      children: s.stocks.map((st) => ({
        name: st.symbol,
        size: Math.max(st.turnover, st.ltp * 1000, 1),
        changePercent: st.changePercent,
      })),
    }));
}

function HeatTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: HeatNode & { changePercent?: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded border border-border bg-[#1b1c24] px-2 py-1 text-xs text-foreground shadow-lg">
      <p className="font-semibold">{p.name}</p>
      {typeof p.changePercent === "number" && (
        <p className={p.changePercent >= 0 ? "text-bull-text" : "text-bear-text"}>
          {formatPct(p.changePercent)}
        </p>
      )}
    </div>
  );
}

function CustomTreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  changePercent?: number;
  depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, changePercent = 0, depth = 0 } =
    props;
  if (width < 2 || height < 2) return null;

  // Only paint leaf stock cells (depth 2 in recharts nested treemap)
  if (depth !== 2) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ fill: "transparent", stroke: "#12131a", strokeWidth: 2 }}
        />
        {width > 48 && height > 18 && (
          <text
            x={x + 6}
            y={y + 14}
            fill="#a1a1aa"
            fontSize={10}
            fontWeight={600}
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  const showPct = width > 56 && height > 36;
  const showName = width > 36 && height > 18;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        style={{
          fill: heatColor(changePercent),
          stroke: "#0e0f15",
          strokeWidth: 1.5,
        }}
      />
      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? 6 : 0)}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(11, width / 6)}
          fontWeight={600}
        >
          {name}
        </text>
      )}
      {showPct && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize={10}
        >
          {formatPct(changePercent)}
        </text>
      )}
    </g>
  );
}

function SectorHeatmap({ sectors }: { sectors: SectorSummary[] }) {
  const data = useMemo(() => buildHeatData(sectors), [sectors]);

  if (!data.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-border bg-surface text-xs text-muted">
        Waiting for live sector quotes…
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-lg border border-border bg-surface p-2 md:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="#12131a"
          fill="#1b1c24"
          content={<CustomTreemapContent />}
          isAnimationActive={false}
        >
          <Tooltip content={<HeatTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function SectorGainersChart({ sectors }: { sectors: SectorSummary[] }) {
  const top = [...sectors]
    .filter((s) => s.avgChangePercent > 0)
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent)
    .slice(0, 10)
    .map((s) => ({
      sector: s.sector.length > 10 ? s.sector.slice(0, 9) + "…" : s.sector,
      full: s.sector,
      avg: Number(s.avgChangePercent.toFixed(2)),
    }));

  if (!top.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-border bg-surface text-xs text-muted">
        No sector gainers in the current session
      </div>
    );
  }

  return (
    <div className="h-[280px] rounded-lg border border-border bg-surface p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Sector Gainers — Top 10
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={top} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <XAxis
            dataKey="sector"
            tick={{ fill: "#7e8494", fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: "#7e8494", fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1b1c24",
              border: "1px solid #2a2b36",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value) => [`${value}%`, "Avg %"]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { full?: string })?.full ?? ""
            }
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {top.map((entry) => (
              <Cell key={entry.full} fill="#22c55e" />
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
    <section className="flex min-h-[280px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, #16a34a 0%, #16a34a ${advRatio * 100}%, #dc2626 ${advRatio * 100}%, #dc2626 100%)`,
        }}
      />
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
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
            className="rounded p-1 text-muted hover:bg-border/40 hover:text-foreground"
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
            className="w-full rounded border border-border bg-[#12131a] px-2 py-1 text-xs text-foreground outline-none focus:border-muted"
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
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted"
                >
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
                        className="font-medium text-foreground hover:text-bull-text"
                      >
                        {r.symbol}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
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
  // formatISTDateTime like "13 Jul 2026, 14:32:01" or similar en-IN
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
        subtitle="Heatmap, sector gainers, and live per-sector boards"
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
        <SectorHeatmap sectors={sectors} />
        <SectorGainersChart sectors={sectors} />
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
