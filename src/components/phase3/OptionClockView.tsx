"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatNumber, formatPct, cn } from "@/lib/utils";
import type { ClockSlot, OptionClockResponse } from "@/lib/phase3-types";

async function fetchClock(underlying: "nifty" | "bank"): Promise<OptionClockResponse> {
  const q = underlying === "bank" ? "?underlying=bank" : "";
  const res = await fetch(`/api/option-clock${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Option clock HTTP ${res.status}`);
  return res.json();
}

export function OptionClockView() {
  const [underlying, setUnderlying] = useState<"nifty" | "bank">("nifty");
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["option-clock", underlying],
    queryFn: () => fetchClock(underlying),
    refetchInterval: 20_000,
  });

  const { rows: sorted, sortKey, sortDir, onSort } = useSortedRows(
    data?.slots ?? [],
    (r: ClockSlot, key) => {
      if (key === "time") return r.time;
      if (key === "close") return r.close;
      if (key === "changePercent") return r.changePercent;
      if (key === "cumulativeFromOpen") return r.cumulativeFromOpen;
      return r.bias;
    },
    "time",
    "asc",
  );

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Option Clock"
        subtitle="15m session clock on the underlying — when call/put momentum was strongest"
        asOf={data?.asOf}
        marketStatus={data?.marketStatus}
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

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setUnderlying("nifty")}
            className={cn(
              "px-3 py-1.5",
              underlying === "nifty"
                ? "bg-border/60 text-foreground"
                : "text-muted hover:bg-border/30",
            )}
          >
            Nifty 50
          </button>
          <button
            type="button"
            onClick={() => setUnderlying("bank")}
            className={cn(
              "px-3 py-1.5",
              underlying === "bank"
                ? "bg-border/60 text-foreground"
                : "text-muted hover:bg-border/30",
            )}
          >
            Bank Nifty
          </button>
        </div>
        {data && (
          <>
            <span className="text-muted">
              {data.underlying}{" "}
              <span
                className={
                  data.underlyingChangePercent >= 0
                    ? "text-bull-text"
                    : "text-bear-text"
                }
              >
                {formatNumber(data.underlyingPrice)}{" "}
                {formatPct(data.underlyingChangePercent)}
              </span>
            </span>
            {data.bestLongWindow && (
              <span className="rounded bg-bull-bg px-2 py-1 text-bull-text">
                Best long window {data.bestLongWindow}
              </span>
            )}
            {data.bestShortWindow && (
              <span className="rounded bg-bear-bg px-2 py-1 text-bear-text">
                Best short window {data.bestShortWindow}
              </span>
            )}
          </>
        )}
      </div>

      <Card title="Session 15m Clock">
        <Table
          columns={[
            { key: "time", label: "Time IST" },
            { key: "close", label: "Close", align: "right" },
            { key: "changePercent", label: "Bar %", align: "right" },
            { key: "cumulativeFromOpen", label: "Cum %", align: "right" },
            { key: "bias", label: "Bias" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
        >
          {sorted.length === 0 ? (
            <EmptyRow colSpan={5} message="No 15m bars yet" />
          ) : (
            sorted.map((r) => (
              <tr key={r.time}>
                <Td className="font-medium">{r.time}</Td>
                <Td align="right">{formatNumber(r.close)}</Td>
                <Td
                  align="right"
                  className={
                    r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                  }
                >
                  {formatPct(r.changePercent)}
                </Td>
                <Td
                  align="right"
                  className={
                    r.cumulativeFromOpen >= 0
                      ? "text-bull-text"
                      : "text-bear-text"
                  }
                >
                  {formatPct(r.cumulativeFromOpen)}
                </Td>
                <Td>
                  <Badge
                    variant={
                      r.bias === "BULL"
                        ? "bull"
                        : r.bias === "BEAR"
                          ? "bear"
                          : "neutral"
                    }
                  >
                    {r.bias}
                  </Badge>
                </Td>
              </tr>
            ))
          )}
        </Table>
      </Card>
      {data?.note && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted">{data.note}</p>
      )}
    </div>
  );
}
