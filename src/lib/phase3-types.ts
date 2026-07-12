export interface IndexQuoteRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
}

export interface IndexDriverRow {
  symbol: string;
  sector: string;
  ltp: number;
  changePercent: number;
  turnover: number;
  contributionBias: "UP" | "DOWN";
}

export interface IndexMoverResponse {
  asOf: string;
  marketStatus: string;
  indices: IndexQuoteRow[];
  topDriversUp: IndexDriverRow[];
  topDriversDown: IndexDriverRow[];
  breadth: { advancers: number; decliners: number; unchanged: number };
  error?: string;
}

export interface ClockSlot {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  changePercent: number;
  bias: "BULL" | "BEAR" | "FLAT";
  cumulativeFromOpen: number;
}

export interface OptionClockResponse {
  asOf: string;
  marketStatus: string;
  underlying: string;
  underlyingPrice: number;
  underlyingChangePercent: number;
  bestLongWindow: string | null;
  bestShortWindow: string | null;
  slots: ClockSlot[];
  note: string;
  error?: string;
}

export interface ApexLeg {
  time: string;
  callLean: number;
  putLean: number;
  netBias: "CALL" | "PUT" | "NEUTRAL";
  indexClose: number;
  changePercent: number;
}

export interface OptionApexResponse {
  asOf: string;
  marketStatus: string;
  nifty: { price: number; changePercent: number };
  bankNifty: { price: number; changePercent: number };
  indiaVix: { price: number; changePercent: number };
  vixRegime: "LOW" | "NORMAL" | "ELEVATED";
  bias: "CALL" | "PUT" | "NEUTRAL";
  biasScore: number;
  summary: string;
  legs: ApexLeg[];
  note: string;
  error?: string;
}
