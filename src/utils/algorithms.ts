import type {
  BreakoutRow,
  IntradayBoostRow,
  LeaderRow,
  LevelRow,
  StockQuote,
} from "@/lib/types";
import {
  ensureAnchor,
  getAnchor,
  markBreakout,
  type SessionAnchor,
} from "@/lib/market/sessionCache";
import type { OpenRange } from "@/lib/market/yahoo";
import { formatISTTime } from "@/lib/market/ist";

const SESSION_MINUTES = 375;

function avgDailyVolume(q: StockQuote): number {
  return q.avgVolume10Day || q.avgVolume3Month || 0;
}

/** Expected cumulative volume by this point in the cash session. */
export function expectedVolumeAtProgress(
  avgVol: number,
  sessionProgress: number,
): number {
  if (avgVol <= 0) return 0;
  const progress = Math.min(1, Math.max(0.02, sessionProgress || 0.02));
  return avgVol * progress;
}

export function computeTurnover(ltp: number, volume: number): number {
  return ltp * volume;
}

export function computeRFactor(
  quote: StockQuote,
  sessionProgress: number,
): number {
  const avg = avgDailyVolume(quote);
  const expected = expectedVolumeAtProgress(avg, sessionProgress);
  if (expected <= 0 || quote.volume <= 0) return 0;

  const rangePct =
    quote.ltp > 0
      ? ((quote.dayHigh - quote.dayLow) / quote.ltp) * 100
      : 0;
  const volatilityCoeff = Math.max(0.5, Math.min(2.5, rangePct / 1.5 || 1));

  return (quote.volume / expected) * volatilityCoeff;
}

export function detectBreakout(
  quote: StockQuote,
  anchor: SessionAnchor,
  sessionProgress: number,
): BreakoutRow | null {
  const avg = avgDailyVolume(quote);
  const expected = expectedVolumeAtProgress(avg, sessionProgress);
  const volumeOk = expected > 0 && quote.volume > 2 * expected;

  if (!volumeOk) return null;

  // Use session extremes so completed (or late-day) breakouts still register,
  // not only when LTP is still outside the open range.
  const brokeBull =
    quote.dayHigh > anchor.open15High || quote.ltp > anchor.open15High;
  const brokeBear =
    quote.dayLow < anchor.open15Low || quote.ltp < anchor.open15Low;

  if (!anchor.firedBull && brokeBull) {
    const signalPercent = quote.changePercent;
    const time = formatISTTime();
    markBreakout(quote.symbol, "BULL", signalPercent, time);
    return {
      signal: "BULL",
      symbol: quote.symbol,
      changePercent: quote.changePercent,
      signalPercent,
      time,
      source: "live",
    };
  }

  if (!anchor.firedBear && brokeBear) {
    const signalPercent = quote.changePercent;
    const time = formatISTTime();
    markBreakout(quote.symbol, "BEAR", signalPercent, time);
    return {
      signal: "BEAR",
      symbol: quote.symbol,
      changePercent: quote.changePercent,
      signalPercent,
      time,
      source: "live",
    };
  }

  return null;
}

/** Include previously fired session breakouts so the table stays populated. */
export function collectBreakoutRows(
  quotes: StockQuote[],
  openRanges: Map<string, OpenRange>,
  sessionProgress: number,
): BreakoutRow[] {
  const rows: BreakoutRow[] = [];

  for (const quote of quotes) {
    const range = openRanges.get(quote.symbol);
    if (!range) continue;

    const anchor = ensureAnchor(quote.symbol, range);
    const fresh = detectBreakout(quote, anchor, sessionProgress);
    if (fresh) {
      rows.push(fresh);
      continue;
    }

    const current = getAnchor(quote.symbol);
    if (!current) continue;

    if (current.firedBull && current.bullTime != null) {
      rows.push({
        signal: "BULL",
        symbol: quote.symbol,
        changePercent: quote.changePercent,
        signalPercent: current.bullSignalPercent ?? quote.changePercent,
        time: current.bullTime,
        source: "live",
      });
    }
    if (current.firedBear && current.bearTime != null) {
      rows.push({
        signal: "BEAR",
        symbol: quote.symbol,
        changePercent: quote.changePercent,
        signalPercent: current.bearSignalPercent ?? quote.changePercent,
        time: current.bearTime,
        source: "live",
      });
    }
  }

  return rows.sort(
    (a, b) => Math.abs(b.signalPercent) - Math.abs(a.signalPercent),
  );
}

export function buildIntradayBoost(
  quotes: StockQuote[],
  sessionProgress: number,
): IntradayBoostRow[] {
  return quotes
    .map((q) => {
      const rFactor = computeRFactor(q, sessionProgress);
      let signal: IntradayBoostRow["signal"] = "NEUTRAL";
      if (rFactor >= 1.5 && q.changePercent > 0.3) signal = "BULL";
      else if (rFactor >= 1.5 && q.changePercent < -0.3) signal = "BEAR";

      return {
        symbol: q.symbol,
        changePercent: q.changePercent,
        rFactor,
        signal,
      };
    })
    .filter((r) => r.rFactor > 0)
    .sort((a, b) => b.rFactor - a.rFactor)
    .slice(0, 25);
}

export function buildTopLevel(quotes: StockQuote[]): LevelRow[] {
  return quotes
    .map((q) => {
      const level = q.dayHigh || q.fiftyTwoWeekHigh;
      const diff = level - q.ltp;
      return {
        symbol: q.symbol,
        ltp: q.ltp,
        level,
        diff,
        changePercent: q.changePercent,
      };
    })
    .filter((r) => r.level > 0 && r.diff >= 0)
    .sort((a, b) => a.diff / a.ltp - b.diff / b.ltp)
    .slice(0, 20);
}

export function buildLowLevel(quotes: StockQuote[]): LevelRow[] {
  return quotes
    .map((q) => {
      const level = q.dayLow || q.fiftyTwoWeekLow;
      const diff = q.ltp - level;
      return {
        symbol: q.symbol,
        ltp: q.ltp,
        level,
        diff,
        changePercent: q.changePercent,
      };
    })
    .filter((r) => r.level > 0 && r.diff >= 0)
    .sort((a, b) => a.diff / a.ltp - b.diff / b.ltp)
    .slice(0, 20);
}

export function buildLeaders(quotes: StockQuote[]): {
  topGainers: LeaderRow[];
  topLosers: LeaderRow[];
  highPower: LeaderRow[];
} {
  const toLeader = (q: StockQuote): LeaderRow => ({
    symbol: q.symbol,
    changePercent: q.changePercent,
    ltp: q.ltp,
    volume: q.volume,
    turnover: computeTurnover(q.ltp, q.volume),
  });

  const sortedByChange = [...quotes].sort(
    (a, b) => b.changePercent - a.changePercent,
  );

  return {
    topGainers: sortedByChange.slice(0, 15).map(toLeader),
    topLosers: sortedByChange
      .slice()
      .reverse()
      .slice(0, 15)
      .map(toLeader),
    highPower: [...quotes]
      .sort(
        (a, b) =>
          computeTurnover(b.ltp, b.volume) - computeTurnover(a.ltp, a.volume),
      )
      .slice(0, 15)
      .map(toLeader),
  };
}

export { SESSION_MINUTES };
