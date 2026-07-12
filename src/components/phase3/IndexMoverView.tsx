"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatCompact, formatNumber, formatPct } from "@/lib/utils";
import type {
  IndexDriverRow,
  IndexMoverResponse,
  IndexQuoteRow,
} from "@/lib/phase3-types";

async function fetchIndexMover(): Promise<IndexMoverResponse> {
  const res = await fetch("/api/index-mover", { cache: "no-store" });
  if (!res.ok) throw new Error(`Index mover HTTP ${res.status}`);
  return res.json();
}

function IndicesTable({ rows }: { rows: IndexQuoteRow[] }) {
  const { rows: sorted, sortKey, sortDir, onSort } = useSortedRows(
    rows,
    (r, key) => {
      if (key === "name") return r.name;
      if (key === "price") return r.price;
      if (key === "dayHigh") return r.dayHigh;
      if (key === "dayLow") return r.dayLow;
      return r.changePercent;
    },
    "changePercent",
    "desc",
  );

  return (
    <Card title="Index Board">
      <Table
        columns={[
          { key: "name", label: "Index" },
          { key: "price", label: "LTP", align: "right" },
          { key: "changePercent", label: "% Chg", align: "right" },
          { key: "dayHigh", label: "High", align: "right" },
          { key: "dayLow", label: "Low", align: "right" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={5} message="No index quotes yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td className="font-medium">{r.name}</Td>
              <Td align="right">{formatNumber(r.price)}</Td>
              <Td
                align="right"
                className={
                  r.changePercent >= 0 ? "text-bull-text" : "text-bear-text"
                }
              >
                {r.changePercent >= 0 ? "↑" : "↓"} {formatPct(r.changePercent)}
              </Td>
              <Td align="right">{formatNumber(r.dayHigh)}</Td>
              <Td align="right">{formatNumber(r.dayLow)}</Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

function DriversTable({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: IndexDriverRow[];
  mode: "up" | "down";
}) {
  const { rows: sorted, sortKey, sortDir, onSort } = useSortedRows(
    rows,
    (r, key) => {
      if (key === "symbol") return r.symbol;
      if (key === "sector") return r.sector;
      if (key === "ltp") return r.ltp;
      if (key === "turnover") return r.turnover;
      return r.changePercent;
    },
    "changePercent",
    mode === "up" ? "desc" : "asc",
  );

  return (
    <Card title={title}>
      <Table
        columns={[
          { key: "symbol", label: "Symbol" },
          { key: "sector", label: "Sector" },
          { key: "ltp", label: "LTP", align: "right" },
          { key: "changePercent", label: "% Chg", align: "right" },
          { key: "turnover", label: "T.O.", align: "right" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={5} message="No drivers yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
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
                {formatPct(r.changePercent)}
              </Td>
              <Td align="right">{formatCompact(r.turnover)}</Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function IndexMoverView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["index-mover"],
    queryFn: fetchIndexMover,
    refetchInterval: 15_000,
  });

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Index Mover"
        subtitle="Live index board + stocks driving breadth"
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
      {data?.breadth && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
          <span className="text-bull-text">Adv {data.breadth.advancers}</span>
          <span className="text-bear-text">Dec {data.breadth.decliners}</span>
          <span>Unch {data.breadth.unchanged}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="md:col-span-2">
          <IndicesTable rows={data?.indices ?? []} />
        </div>
        <DriversTable
          title="Drivers Up"
          rows={data?.topDriversUp ?? []}
          mode="up"
        />
        <DriversTable
          title="Drivers Down"
          rows={data?.topDriversDown ?? []}
          mode="down"
        />
      </div>
    </div>
  );
}
