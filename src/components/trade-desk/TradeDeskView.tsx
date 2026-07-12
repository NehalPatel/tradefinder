"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { tradingViewUrl } from "@/components/SymbolLink";
import { formatNumber, formatPct, cn } from "@/lib/utils";
import type { TradeDeskResponse, TradeSetup } from "@/lib/trade-desk-types";

async function fetchTradeDesk(): Promise<TradeDeskResponse> {
  const res = await fetch("/api/trade-desk", { cache: "no-store" });
  if (!res.ok) throw new Error(`Trade desk HTTP ${res.status}`);
  return res.json();
}

function ActionBadge({ action }: { action: TradeSetup["action"] }) {
  if (action === "ENTER") {
    return (
      <span className="rounded bg-bull-bg px-2 py-0.5 text-[11px] font-bold tracking-wide text-bull-text">
        ENTER
      </span>
    );
  }
  if (action === "WAIT") {
    return (
      <span className="rounded bg-border/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-foreground">
        WAIT
      </span>
    );
  }
  return (
    <span className="rounded bg-bear-bg px-2 py-0.5 text-[11px] font-bold tracking-wide text-bear-text">
      AVOID
    </span>
  );
}

function SetupCard({ setup }: { setup: TradeSetup }) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <ActionBadge action={setup.action} />
        <Badge variant={setup.side === "LONG" ? "bull" : "bear"}>
          {setup.side}
        </Badge>
        <a
          href={tradingViewUrl(setup.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-base font-semibold text-foreground hover:text-bull-text"
        >
          {setup.symbol}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
        <span className="ml-auto text-xs text-muted">{setup.sector}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <p className="text-muted">Score</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {setup.score}
          </p>
        </div>
        <div>
          <p className="text-muted">LTP</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              setup.changePercent >= 0 ? "text-bull-text" : "text-bear-text",
            )}
          >
            {formatNumber(setup.ltp)}{" "}
            <span className="text-[11px] font-medium">
              {formatPct(setup.changePercent)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted">R.Fac / R.Vol</p>
          <p className="font-medium tabular-nums">
            {formatNumber(setup.rFactor, 2)} / {formatNumber(setup.relativeVolume, 2)}×
          </p>
        </div>
        <div>
          <p className="text-muted">When</p>
          <p className="font-medium leading-snug text-foreground">{setup.when}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 rounded-md border border-border/80 bg-[#12131a] p-3 text-xs sm:grid-cols-3">
        <div>
          <p className="mb-0.5 text-muted">Entry zone</p>
          <p className="font-semibold tabular-nums">
            {formatNumber(setup.entryLow)} – {formatNumber(setup.entryHigh)}
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-muted">Invalidation</p>
          <p className="font-semibold tabular-nums text-bear-text">
            {formatNumber(setup.invalidation)}
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-muted">Target (≈1:2)</p>
          <p className="font-semibold tabular-nums text-bull-text">
            {formatNumber(setup.target)}
          </p>
        </div>
      </div>

      <ul className="space-y-1 text-[11px] leading-relaxed text-muted">
        {setup.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-bull-text">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SetupSection({
  title,
  setups,
  empty,
}: {
  title: string;
  setups: TradeSetup[];
  empty: string;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}{" "}
        <span className="text-foreground">({setups.length})</span>
      </h2>
      {setups.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-xs text-muted">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {setups.map((s) => (
            <SetupCard key={`${s.action}-${s.symbol}-${s.side}`} setup={s} />
          ))}
        </div>
      )}
    </section>
  );
}

export function TradeDeskView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["trade-desk"],
    queryFn: fetchTradeDesk,
    refetchInterval: 12_000,
  });

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Trade Desk"
        subtitle="Ranked equity setups — which stock, long/short, enter or wait, and why"
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

      {data?.banner && (
        <div className="mb-4 rounded-md border border-border bg-border/30 px-3 py-2 text-xs text-muted">
          {data.banner}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-3 text-xs text-muted">
        <span className="rounded bg-bull-bg px-2 py-1 text-bull-text">
          ENTER {data?.enter.length ?? 0}
        </span>
        <span className="rounded bg-border/60 px-2 py-1 text-foreground">
          WAIT {data?.wait.length ?? 0}
        </span>
        <span className="rounded bg-border/40 px-2 py-1">
          AVOID filtered {data?.avoidCount ?? 0}
        </span>
        {data && (
          <span>
            Window:{" "}
            {data.actionableWindow
              ? "Actionable"
              : data.marketOpen
                ? "Prefer wait"
                : "Closed"}
          </span>
        )}
      </div>

      <SetupSection
        title="Enter now"
        setups={data?.enter ?? []}
        empty="No ENTER setups yet — confluence needs break + volume + sector alignment"
      />
      <SetupSection
        title="Wait"
        setups={data?.wait ?? []}
        empty="No WAIT setups — market may be quiet or still hydrating open-range levels"
      />

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Rule-based confluence helper from live Yahoo quotes — not financial
        advice. Always verify structure on the 5m chart before trading.
      </p>
    </div>
  );
}
