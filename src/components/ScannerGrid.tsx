"use client";

import { BreakoutBeacon } from "@/components/scanners/BreakoutBeacon";
import { IntradayBoost } from "@/components/scanners/IntradayBoost";
import {
  HighPowerStocks,
  TopGainers,
  TopLosers,
} from "@/components/scanners/LeadersMatrix";
import {
  LowLevelStocks,
  TopLevelStocks,
} from "@/components/scanners/LevelTrackers";
import { useMarketData } from "@/hooks/useMarketData";

function StatusBar() {
  const { data, isLoading, isFetching, isError, error } = useMarketData();

  const statusLabel =
    data?.marketStatus === "open"
      ? "Market Open"
      : data?.marketStatus === "preopen"
        ? "Pre-Open"
        : data?.marketStatus === "closed"
          ? "Market Closed"
          : "Status Unknown";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted">
      <h1 className="mr-auto text-sm font-semibold text-foreground">
        Market Pulse
      </h1>
      <span
        className={
          data?.marketOpen
            ? "rounded bg-bull-bg px-2 py-0.5 text-bull-text"
            : "rounded bg-border/50 px-2 py-0.5"
        }
      >
        {isLoading ? "Connecting…" : statusLabel}
      </span>
      {data && (
        <>
          <span>
            Universe {data.quotesFetched}/{data.universeSize}
          </span>
          <span>As of {data.asOf} IST</span>
        </>
      )}
      {isFetching && !isLoading && <span className="text-muted">Refreshing…</span>}
      {isError && (
        <span className="text-bear-text">
          {error instanceof Error ? error.message : "Feed error"}
        </span>
      )}
      {data?.error && (
        <span className="text-bear-text">{data.error}</span>
      )}
    </div>
  );
}

export function ScannerGrid() {
  const { data, isLoading } = useMarketData();

  const empty = {
    breakouts: [] as never[],
    breakoutsSource: "live" as const,
    intradayBoost: [],
    topLevel: [],
    lowLevel: [],
    topGainers: [],
    topLosers: [],
    highPower: [],
  };

  const pulse = data ?? empty;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
      <StatusBar />
      {isLoading && !data && (
        <p className="mb-3 text-xs text-muted">
          Fetching live NSE quotes for the F&amp;O universe…
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
        <div className="xl:col-span-1 2xl:col-span-1">
          <BreakoutBeacon
            rows={pulse.breakouts}
            source={data?.breakoutsSource}
            sessionDate={data?.breakoutsSessionDate}
          />
        </div>
        <div className="xl:col-span-1">
          <IntradayBoost rows={pulse.intradayBoost} />
        </div>
        <div className="xl:col-span-1">
          <TopLevelStocks rows={pulse.topLevel} />
        </div>
        <div className="xl:col-span-1">
          <LowLevelStocks rows={pulse.lowLevel} />
        </div>
        <div className="xl:col-span-1">
          <TopGainers rows={pulse.topGainers} />
        </div>
        <div className="xl:col-span-1">
          <TopLosers rows={pulse.topLosers} />
        </div>
        <div className="xl:col-span-1 2xl:col-span-2">
          <HighPowerStocks rows={pulse.highPower} />
        </div>
      </div>
    </div>
  );
}
