"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatNumber, formatPct } from "@/lib/utils";
import type { SwingRow, SwingSpectrumResponse } from "@/lib/phase2-types";

async function fetchSwing(): Promise<SwingSpectrumResponse> {
  const res = await fetch("/api/swing-spectrum", { cache: "no-store" });
  if (!res.ok) throw new Error(`Swing spectrum HTTP ${res.status}`);
  return res.json();
}

function getValue(row: SwingRow, key: string): string | number {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "sector":
      return row.sector;
    case "ltp":
      return row.ltp;
    case "changePercent":
      return row.changePercent;
    case "pctFromHigh":
      return row.pctFromHigh;
    case "pctFromLow":
      return row.pctFromLow;
    case "swingBias":
      return row.swingBias;
    case "signal":
      return row.signal;
    case "score":
      return row.score;
    default:
      return 0;
  }
}

function SwingTable({
  title,
  rows,
  emptyMessage,
  initialKey,
  initialDir,
}: {
  title: string;
  rows: SwingRow[];
  emptyMessage: string;
  initialKey: string;
  initialDir: "asc" | "desc";
}) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, initialKey, initialDir);

  return (
    <Card title={title}>
      <Table
        columns={[
          { key: "symbol", label: "Symbol" },
          { key: "sector", label: "Sector" },
          { key: "ltp", label: "LTP", align: "right" },
          { key: "changePercent", label: "% Chg", align: "right" },
          { key: "pctFromHigh", label: "vs 52W H", align: "right" },
          { key: "pctFromLow", label: "vs 52W L", align: "right" },
          { key: "swingBias", label: "Bias" },
          { key: "signal", label: "Signal" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={8} message={emptyMessage} />
        ) : (
          sorted.map((r) => (
            <tr key={`${title}-${r.symbol}`}>
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
                {r.changePercent >= 0 ? "↑" : "↓"} {formatPct(r.changePercent)}
              </Td>
              <Td align="right">{formatPct(r.pctFromHigh)}</Td>
              <Td align="right">{formatPct(r.pctFromLow)}</Td>
              <Td className="text-muted">{r.swingBias.replace("_", " ")}</Td>
              <Td>
                <Badge
                  variant={
                    r.signal === "BULL"
                      ? "bull"
                      : r.signal === "BEAR"
                        ? "bear"
                        : "neutral"
                  }
                >
                  {r.signal}
                </Badge>
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function SwingSpectrumView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["swing-spectrum"],
    queryFn: fetchSwing,
    refetchInterval: 20_000,
  });

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Swing Spectrum"
        subtitle="Multi-day swing setups near 52-week extremes and strong session momentum"
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <SwingTable
          title="Near 52W High"
          rows={data?.nearHigh ?? []}
          emptyMessage="No stocks within 5% of 52-week high"
          initialKey="pctFromHigh"
          initialDir="desc"
        />
        <SwingTable
          title="Near 52W Low"
          rows={data?.nearLow ?? []}
          emptyMessage="No stocks near 52-week low support"
          initialKey="pctFromLow"
          initialDir="asc"
        />
        <div className="md:col-span-2">
          <SwingTable
            title="Session Momentum Swings"
            rows={data?.momentum ?? []}
            emptyMessage="No momentum candidates yet"
            initialKey="changePercent"
            initialDir="desc"
          />
        </div>
      </div>
    </div>
  );
}
