"use client";

import { cn } from "@/lib/utils";
import type { SortDir } from "@/hooks/useSortedRows";

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
}

export function Table({
  columns,
  sortKey,
  sortDir,
  onSort,
  children,
  className,
}: {
  columns: TableColumn[];
  sortKey?: string;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full border-collapse text-left text-xs", className)}>
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
          {columns.map((col) => {
            const sortable = col.sortable !== false && !!onSort;
            const active = sortKey === col.key;
            return (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 font-medium",
                  col.align === "right" && "text-right",
                )}
              >
                {sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                      col.align === "right" && "ml-auto",
                      active && "text-foreground",
                    )}
                  >
                    {col.label}
                    <span className="text-[9px] opacity-80" aria-hidden>
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "◇"}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "border-b border-border/60 px-4 py-2 whitespace-nowrap",
        align === "right" && "text-right tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
        {message}
      </td>
    </tr>
  );
}
