"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatNumber, formatPct } from "@/lib/utils";
import type { IntradayBoostRow } from "@/lib/types";

const COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "changePercent", label: "% Change", align: "right" as const },
  { key: "rFactor", label: "R.Fac", align: "right" as const },
  { key: "signal", label: "Signal" },
];

function getValue(row: IntradayBoostRow, key: string): string | number {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "changePercent":
      return row.changePercent;
    case "rFactor":
      return row.rFactor;
    case "signal":
      return row.signal;
    default:
      return 0;
  }
}

export function IntradayBoost({ rows }: { rows: IntradayBoostRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "rFactor", "desc");

  return (
    <Card title="Intraday Boost">
      <Table
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="Waiting for live volume metrics" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td>
                <SymbolLink symbol={r.symbol} />
              </Td>
              <Td
                align="right"
                className={
                  r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                }
              >
                {r.changePercent >= 0 ? "↑" : "↓"} {formatPct(r.changePercent)}
              </Td>
              <Td align="right">{formatNumber(r.rFactor, 2)}</Td>
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
