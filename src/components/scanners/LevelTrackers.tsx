"use client";

import { Card } from "@/components/ui/card";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatNumber, formatPct } from "@/lib/utils";
import type { LevelRow } from "@/lib/types";

const COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "ltp", label: "LTP", align: "right" as const },
  { key: "level", label: "Level", align: "right" as const },
  { key: "diff", label: "Diff", align: "right" as const },
  { key: "changePercent", label: "% Chg", align: "right" as const },
];

function getValue(row: LevelRow, key: string): string | number {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "ltp":
      return row.ltp;
    case "level":
      return row.level;
    case "diff":
      return row.diff;
    case "changePercent":
      return row.changePercent;
    default:
      return 0;
  }
}

function LevelTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: LevelRow[];
  emptyMessage: string;
}) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "diff", "asc");

  return (
    <Card title={title}>
      <Table
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={5} message={emptyMessage} />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td>
                <SymbolLink symbol={r.symbol} />
              </Td>
              <Td align="right">{formatNumber(r.ltp)}</Td>
              <Td align="right">{formatNumber(r.level)}</Td>
              <Td align="right" className="text-muted">
                {formatNumber(r.diff)}
              </Td>
              <Td
                align="right"
                className={
                  r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                }
              >
                {formatPct(r.changePercent)}
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function TopLevelStocks({ rows }: { rows: LevelRow[] }) {
  return (
    <LevelTable
      title="Top Level Stocks"
      rows={rows}
      emptyMessage="No level proximity data yet"
    />
  );
}

export function LowLevelStocks({ rows }: { rows: LevelRow[] }) {
  return (
    <LevelTable
      title="Low Level Stocks"
      rows={rows}
      emptyMessage="No support proximity data yet"
    />
  );
}
