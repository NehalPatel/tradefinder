"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SymbolLink } from "@/components/SymbolLink";
import { EmptyRow, Table, Td } from "@/components/ui/table";
import { useSortedRows } from "@/hooks/useSortedRows";
import { formatCompact, formatNumber, formatPct } from "@/lib/utils";
import type {
  SectorIndexRow,
  SectorScopeResponse,
  SectorStockRow,
  SectorSummary,
} from "@/lib/phase2-types";

async function fetchSectorScope(): Promise<SectorScopeResponse> {
  const res = await fetch("/api/sector-scope", { cache: "no-store" });
  if (!res.ok) throw new Error(`Sector scope HTTP ${res.status}`);
  return res.json();
}

function IndexHeat({ rows }: { rows: SectorIndexRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(
    rows,
    (r, key) => {
      if (key === "name") return r.name;
      if (key === "sector") return r.sector;
      if (key === "price") return r.price;
      return r.changePercent;
    },
    "changePercent",
    "desc",
  );

  return (
    <Card title="Sector Indices">
      <Table
        columns={[
          { key: "name", label: "Index" },
          { key: "sector", label: "Sector" },
          { key: "price", label: "LTP", align: "right" },
          { key: "changePercent", label: "% Chg", align: "right" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="No sector index quotes yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.symbol}>
              <Td className="font-medium">{r.name}</Td>
              <Td className="text-muted">{r.sector}</Td>
              <Td align="right">{formatNumber(r.price)}</Td>
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

function SectorBoard({ rows }: { rows: SectorSummary[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(
    rows,
    (r, key) => {
      if (key === "sector") return r.sector;
      if (key === "stockCount") return r.stockCount;
      if (key === "avgChangePercent") return r.avgChangePercent;
      if (key === "totalTurnover") return r.totalTurnover;
      if (key === "advancers") return r.advancers;
      return r.decliners;
    },
    "avgChangePercent",
    "desc",
  );

  return (
    <Card title="Sector Momentum">
      <Table
        columns={[
          { key: "sector", label: "Sector" },
          { key: "stockCount", label: "N", align: "right" },
          { key: "avgChangePercent", label: "Avg %", align: "right" },
          { key: "advancers", label: "Adv", align: "right" },
          { key: "decliners", label: "Dec", align: "right" },
          { key: "totalTurnover", label: "T.O.", align: "right" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={6} message="No sector aggregates yet" />
        ) : (
          sorted.map((r) => (
            <tr key={r.sector}>
              <Td className="font-medium">{r.sector}</Td>
              <Td align="right">{r.stockCount}</Td>
              <Td
                align="right"
                className={
                  r.avgChangePercent >= 0 ? "text-bull-text" : "text-bear-text"
                }
              >
                {formatPct(r.avgChangePercent)}
              </Td>
              <Td align="right" className="text-bull-text">
                {r.advancers}
              </Td>
              <Td align="right" className="text-bear-text">
                {r.decliners}
              </Td>
              <Td align="right">{formatCompact(r.totalTurnover)}</Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

function HotStocks({ rows }: { rows: SectorStockRow[] }) {
  const {
    rows: sorted,
    sortKey,
    sortDir,
    onSort,
  } = useSortedRows(
    rows,
    (r, key) => {
      if (key === "symbol") return r.symbol;
      if (key === "sector") return r.sector;
      if (key === "ltp") return r.ltp;
      if (key === "changePercent") return r.changePercent;
      if (key === "relativeVolume") return r.relativeVolume;
      return r.turnover;
    },
    "changePercent",
    "desc",
  );

  return (
    <Card title="Hot Stocks by Sector Move">
      <Table
        columns={[
          { key: "symbol", label: "Symbol" },
          { key: "sector", label: "Sector" },
          { key: "ltp", label: "LTP", align: "right" },
          { key: "changePercent", label: "% Chg", align: "right" },
          { key: "relativeVolume", label: "R.Vol", align: "right" },
          { key: "turnover", label: "T.O.", align: "right" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sorted.length === 0 ? (
          <EmptyRow colSpan={6} message="No hot stocks yet" />
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
                {r.changePercent >= 0 ? "↑" : "↓"} {formatPct(r.changePercent)}
              </Td>
              <Td align="right">{formatNumber(r.relativeVolume, 2)}</Td>
              <Td align="right">{formatCompact(r.turnover)}</Td>
            </tr>
          ))
        )}
      </Table>
    </Card>
  );
}

export function SectorScopeView() {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["sector-scope"],
    queryFn: fetchSectorScope,
    refetchInterval: 20_000,
  });

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Sector Scope"
        subtitle="Live sector momentum and where volume is concentrating"
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
        <IndexHeat rows={data?.sectorIndices ?? []} />
        <SectorBoard rows={data?.sectors ?? []} />
        <div className="md:col-span-2">
          <HotStocks rows={data?.hotStocks ?? []} />
        </div>
      </div>
    </div>
  );
}
