"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketPulseResponse } from "@/lib/types";

async function fetchMarketPulse(): Promise<MarketPulseResponse> {
  const res = await fetch("/api/market-pulse", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Market pulse HTTP ${res.status}`);
  }
  return res.json();
}

export function useMarketData(refreshInterval = 12_000) {
  return useQuery({
    queryKey: ["market-pulse"],
    queryFn: fetchMarketPulse,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    retry: 2,
  });
}
