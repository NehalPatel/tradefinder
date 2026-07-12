"use client";

import { Card } from "@/components/ui/card";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatCompact, formatNumber, formatPct } from "@/lib/utils";
import type { LeaderRow } from "@/lib/types";

const GAINER_COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "ltp", label: "LTP", align: "right" as const },
  { key: "changePercent", label: "% Chg", align: "right" as const },
  { key: "volume", label: "Volume", align: "right" as const },
];

const POWER_COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "ltp", label: "LTP", align: "right" as const },
  { key: "turnover", label: "T.O.", align: "right" as const },
  { key: "changePercent", label: "% Chg", align: "right" as const },
];

function getValue(row: LeaderRow, key: string): string | number {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "ltp":
      return row.ltp;
    case "changePercent":
      return row.changePercent;
    case "volume":
      return row.volume;
    case "turnover":
      return row.turnover;
    default:
      return 0;
  }
}

export function TopGainers({ rows }: { rows: LeaderRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "changePercent", "desc");

  return (
    <Card title="Top Gainers">
      <Table
        columns={GAINER_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="No gainer quotes yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td>
                <SymbolLink symbol={r.symbol} />
              </Td>
              <Td align="right">{formatNumber(r.ltp)}</Td>
              <Td align="right" className="text-bull-text">
                ↑ {formatPct(r.changePercent)}
              </Td>
              <Td align="right" className="text-muted">
                {formatCompact(r.volume)}
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function TopLosers({ rows }: { rows: LeaderRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "changePercent", "asc");

  return (
    <Card title="Top Losers">
      <Table
        columns={GAINER_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="No loser quotes yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td>
                <SymbolLink symbol={r.symbol} />
              </Td>
              <Td align="right">{formatNumber(r.ltp)}</Td>
              <Td align="right" className="text-bear-text">
                ↓ {formatPct(r.changePercent)}
              </Td>
              <Td align="right" className="text-muted">
                {formatCompact(r.volume)}
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function HighPowerStocks({ rows }: { rows: LeaderRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(rows, getValue, "turnover", "desc");

  return (
    <Card title="High Pow. Stocks">
      <Table
        columns={POWER_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="No turnover leaders yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td>
                <SymbolLink symbol={r.symbol} />
              </Td>
              <Td align="right">{formatNumber(r.ltp)}</Td>
              <Td align="right">{formatCompact(r.turnover)}</Td>
              <Td
                align="right"
                className={
                  r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                }
              >
                {r.changePercent >= 0 ? "↑" : "↓"} {formatPct(r.changePercent)}
              </Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}
