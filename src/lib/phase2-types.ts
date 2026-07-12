import type { SignalSide, StockQuote } from "@/lib/types";

export interface SectorSummary {
  sector: string;
  stockCount: number;
  avgChangePercent: number;
  totalTurnover: number;
  advancers: number;
  decliners: number;
  leaders: SectorStockRow[];
}

export interface SectorStockRow {
  symbol: string;
  sector: string;
  ltp: number;
  changePercent: number;
  volume: number;
  turnover: number;
  relativeVolume: number;
}

export interface SectorIndexRow {
  name: string;
  sector: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export interface InsiderRow {
  symbol: string;
  sector: string;
  ltp: number;
  changePercent: number;
  relativeVolume: number;
  turnover: number;
  signal: SignalSide;
  score: number;
}

export interface SwingRow {
  symbol: string;
  sector: string;
  ltp: number;
  changePercent: number;
  pctFromHigh: number;
  pctFromLow: number;
  swingBias: "NEAR_HIGH" | "NEAR_LOW" | "MID_RANGE";
  signal: SignalSide | "NEUTRAL";
  score: number;
}

export interface SectorScopeResponse {
  asOf: string;
  marketStatus: string;
  quotesFetched: number;
  sectorIndices: SectorIndexRow[];
  sectors: SectorSummary[];
  hotStocks: SectorStockRow[];
  error?: string;
}

export interface InsiderStrategyResponse {
  asOf: string;
  marketStatus: string;
  quotesFetched: number;
  rows: InsiderRow[];
  error?: string;
}

export interface SwingSpectrumResponse {
  asOf: string;
  marketStatus: string;
  quotesFetched: number;
  nearHigh: SwingRow[];
  nearLow: SwingRow[];
  momentum: SwingRow[];
  error?: string;
}
