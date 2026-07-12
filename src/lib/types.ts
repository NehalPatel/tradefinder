export type SignalSide = "BULL" | "BEAR";

export interface BreakoutRow {
  signal: SignalSide;
  symbol: string;
  changePercent: number;
  signalPercent: number;
  time: string;
  /** live = current/latest session; prior = previous trading day fallback */
  source?: "live" | "prior";
  sessionDate?: string;
}

export interface IntradayBoostRow {
  symbol: string;
  changePercent: number;
  rFactor: number;
  signal: SignalSide | "NEUTRAL";
}

export interface LevelRow {
  symbol: string;
  ltp: number;
  level: number;
  diff: number;
  changePercent: number;
}

export interface LeaderRow {
  symbol: string;
  changePercent: number;
  ltp: number;
  volume: number;
  turnover: number;
}

export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface MarketPulseResponse {
  asOf: string;
  marketOpen: boolean;
  marketStatus: "open" | "closed" | "preopen" | "unknown";
  universeSize: number;
  quotesFetched: number;
  breakouts: BreakoutRow[];
  /** Whether Breakout Beacon is showing live session or prior-day fallback */
  breakoutsSource: "live" | "prior";
  breakoutsSessionDate?: string;
  intradayBoost: IntradayBoostRow[];
  topLevel: LevelRow[];
  lowLevel: LevelRow[];
  topGainers: LeaderRow[];
  topLosers: LeaderRow[];
  highPower: LeaderRow[];
  error?: string;
}

export interface StockQuote {
  symbol: string;
  yahooSymbol: string;
  ltp: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  changePercent: number;
  volume: number;
  avgVolume10Day: number;
  avgVolume3Month: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}
