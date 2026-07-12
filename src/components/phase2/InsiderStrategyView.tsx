"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatCompact, formatNumber, formatPct } from "@/lib/utils";
import type { InsiderRow, InsiderStrategyResponse } from "@/lib/phase2-types";

async function fetchInsider(): Promise<InsiderStrategyResponse> {
  const res = await fetch("/api/insider-strategy", { cache: "no-store" });
  if (!res.ok) throw new Error(`Insider strategy HTTP ${res.status}`);
  return res.json();
}

function getValue(row: InsiderRow, key: string): string | number {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "sector":
      return row.sector;
    case "ltp":
      return row.ltp;
    case "changePercent":
      return row.changePercent;
    case "relativeVolume":
      return row.relativeVolume;
    case "turnover":
      return row.turnover;
    case "score":
      return row.score;
    case "signal":
      return row.signal;
    default:
      return 0;
  }
}

export function InsiderStrategyView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["insider-strategy"],
    queryFn: fetchInsider,
    refetchInterval: 15_000,
  });

  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(data?.rows ?? [], getValue, "score", "desc");

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Insider Strategy"
        subtitle="Unusual volume + turnover footprint (smart-money activity proxy from live quotes)"
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
      <div className="grid grid-cols-1 gap-5 md:gap-6">
        <Card title="High Conviction Activity">
          <Table
            columns={[
              { key: "signal", label: "Signal" },
              { key: "symbol", label: "Symbol" },
              { key: "sector", label: "Sector" },
              { key: "ltp", label: "LTP", align: "right" },
              { key: "changePercent", label: "% Chg", align: "right" },
              { key: "relativeVolume", label: "R.Vol", align: "right" },
              { key: "turnover", label: "T.O.", align: "right" },
              { key: "score", label: "Score", align: "right" },
            ]}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          >
            {sorted.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="No unusual-volume footprints yet (needs relative volume ≥ 1.2×)"
              />
            ) : (
              sorted.map((r) => (
                <tr key={r.symbol}>
                  <Td>
                    <Badge variant={r.signal === "BULL" ? "bull" : "bear"}>
                      {r.signal}
                    </Badge>
                  </Td>
                  <Td>
                    <SymbolLink symbol={r.symbol} />
                  </Td>
                  <Td className="text-muted">{r.sector}</Td>
                  <Td align="right">{formatNumber(r.ltp)}</Td>
                  <Td
                    align="right"
                    className={
                      r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                    }
                  >
                    {r.changePercent >= 0 ? "↑" : "↓"}{" "}
                    {formatPct(r.changePercent)}
                  </Td>
                  <Td align="right">{formatNumber(r.relativeVolume, 2)}</Td>
                  <Td align="right">{formatCompact(r.turnover)}</Td>
                  <Td align="right">{formatNumber(r.score, 1)}</Td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </div>
  );
}
