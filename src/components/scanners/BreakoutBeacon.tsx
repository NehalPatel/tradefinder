"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatPct } from "@/lib/utils";
import type { BreakoutRow } from "@/lib/types";

const COLUMNS = [
  { key: "signal", label: "Signal" },
  { key: "symbol", label: "Symbol" },
  { key: "changePercent", label: "% Change", align: "right" as const },
  { key: "signalPercent", label: "Signal %", align: "right" as const },
  { key: "time", label: "Time", align: "right" as const },
];

function getValue(row: BreakoutRow, key: string): string | number {
  switch (key) {
    case "signal":
      return row.signal;
    case "symbol":
      return row.symbol;
    case "changePercent":
      return row.changePercent;
    case "signalPercent":
      return row.signalPercent;
    case "time":
      return row.time;
    default:
      return 0;
  }
}

export function BreakoutBeacon({
  rows,
  source = "live",
  sessionDate,
}: {
  rows: BreakoutRow[];
  source?: "live" | "prior";
  sessionDate?: string;
}) {
  const isPrior = source === "prior";
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "signalPercent", "desc");

  return (
    <Card
      title="Breakout Beacon"
      action={
        isPrior ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Prior session{sessionDate ? ` · ${sessionDate}` : ""}
          </span>
        ) : null
      }
    >
      <Table
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow
            colSpan={5}
            message="Scanning for open-range breakouts… (prior session loads if none today)"
          />
        ) : (
          sorted.map((r) => (
            <tr key={`${r.symbol}-${r.signal}-${r.time}-${r.sessionDate ?? ""}`}>
              <Td>
                <Badge variant={r.signal === "BULL" ? "bull" : "bear"}>
                  {r.signal}
                </Badge>
              </Td>
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
              <Td align="right">{formatPct(r.signalPercent)}</Td>
              <Td align="right" className="text-muted">
                {r.time}
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}
