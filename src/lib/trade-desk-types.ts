export type TradeAction = "ENTER" | "WAIT" | "AVOID";
export type TradeSide = "LONG" | "SHORT";

export interface TradeSetup {
  action: TradeAction;
  side: TradeSide;
  symbol: string;
  sector: string;
  score: number;
  ltp: number;
  changePercent: number;
  entryLow: number;
  entryHigh: number;
  invalidation: number;
  target: number;
  when: string;
  reasons: string[];
  rFactor: number;
  relativeVolume: number;
}

export interface TradeDeskResponse {
  asOf: string;
  marketOpen: boolean;
  marketStatus: "open" | "closed" | "preopen" | "unknown";
  sessionDate: string;
  quotesFetched: number;
  actionableWindow: boolean;
  enter: TradeSetup[];
  wait: TradeSetup[];
  avoidCount: number;
  banner?: string;
  error?: string;
}
