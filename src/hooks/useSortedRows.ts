"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export function useSortedRows<T>(
  rows: T[],
  getValue: (row: T, key: string) => string | number,
  initialKey: string,
  initialDir: SortDir = "desc",
) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const onSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      } else {
        cmp = Number(av) - Number(bv);
      }
      if (cmp === 0) return 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir, getValue]);

  return { rows: sorted, sortKey, sortDir, onSort };
}
