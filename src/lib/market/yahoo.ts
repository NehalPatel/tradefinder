import YahooFinance from "yahoo-finance2";
import type { StockQuote, TickerItem } from "@/lib/types";
import {
  fromYahooSymbol,
  GLOBAL_TICKER_SYMBOLS,
  NSE_UNIVERSE,
  toYahooSymbol,
} from "@/lib/universe";

const yahooFinance = new YahooFinance({
  queue: { concurrency: 4, interval: 200 },
  suppressNotices: ["yahooSurvey"],
});

const QUOTE_CHUNK = 40;

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function fetchUniverseQuotes(
  symbols: readonly string[] = NSE_UNIVERSE,
): Promise<StockQuote[]> {
  const yahooSymbols = symbols.map(toYahooSymbol);
  const results: StockQuote[] = [];

  for (let i = 0; i < yahooSymbols.length; i += QUOTE_CHUNK) {
    const chunk = yahooSymbols.slice(i, i + QUOTE_CHUNK);
    try {
      const raw = await yahooFinance.quote(chunk, {
        return: "array",
      });
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

      for (const q of list) {
        if (!q?.symbol) continue;
        const ltp = asNumber(q.regularMarketPrice);
        if (ltp <= 0) continue;

        const previousClose = asNumber(q.regularMarketPreviousClose, ltp);
        const changePercent =
          typeof q.regularMarketChangePercent === "number"
            ? q.regularMarketChangePercent
            : previousClose
              ? ((ltp - previousClose) / previousClose) * 100
              : 0;

        results.push({
          symbol: fromYahooSymbol(q.symbol),
          yahooSymbol: q.symbol,
          ltp,
          open: asNumber(q.regularMarketOpen, ltp),
          dayHigh: asNumber(q.regularMarketDayHigh, ltp),
          dayLow: asNumber(q.regularMarketDayLow, ltp),
          previousClose,
          changePercent,
          volume: asNumber(q.regularMarketVolume),
          avgVolume10Day: asNumber(q.averageDailyVolume10Day),
          avgVolume3Month: asNumber(q.averageDailyVolume3Month),
          fiftyTwoWeekHigh: asNumber(q.fiftyTwoWeekHigh, ltp),
          fiftyTwoWeekLow: asNumber(q.fiftyTwoWeekLow, ltp),
        });
      }
    } catch (error) {
      console.error("Quote chunk failed:", chunk[0], error);
    }
  }

  return results;
}

export interface OpenRange {
  high: number;
  low: number;
  volume: number;
}

/** First 15-minute candle of the NSE cash session (approx via Yahoo 15m bars). */
export async function fetchOpen15Range(
  yahooSymbol: string,
): Promise<OpenRange | null> {
  try {
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - 2 * 24 * 60 * 60 * 1000);

    const chart = await yahooFinance.chart(yahooSymbol, {
      period1,
      period2,
      interval: "15m",
      return: "array",
    });

    const quotes = chart?.quotes ?? [];
    if (!quotes.length) return null;

    // Prefer today's first bar after ~09:15 IST; fallback to latest session's first bar.
    const withVolume = quotes.filter(
      (c) =>
        c &&
        typeof c.high === "number" &&
        typeof c.low === "number" &&
        c.date instanceof Date,
    );

    if (!withVolume.length) return null;

    // Group by calendar date (IST-ish via local representation of bar date)
    const byDay = new Map<string, typeof withVolume>();
    for (const bar of withVolume) {
      const key = bar.date!.toISOString().slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(bar);
      byDay.set(key, list);
    }

    const days = [...byDay.keys()].sort();
    const latestDay = days[days.length - 1];
    const dayBars = (byDay.get(latestDay) ?? []).sort(
      (a, b) => a.date!.getTime() - b.date!.getTime(),
    );
    const first = dayBars[0];
    if (!first || first.high == null || first.low == null) return null;

    return {
      high: first.high,
      low: first.low,
      volume: asNumber(first.volume),
    };
  } catch (error) {
    console.error("Open15 fetch failed:", yahooSymbol, error);
    return null;
  }
}

export async function fetchGlobalTicker(): Promise<TickerItem[]> {
  const symbols = GLOBAL_TICKER_SYMBOLS.map((s) => s.yahoo);
  const nameByYahoo = new Map(
    GLOBAL_TICKER_SYMBOLS.map((s) => [s.yahoo, s.name]),
  );

  try {
    const raw = await yahooFinance.quote(symbols, { return: "array" });
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return list
      .filter((q) => q?.symbol && typeof q.regularMarketPrice === "number")
      .map((q) => ({
        symbol: q.symbol!,
        name: nameByYahoo.get(q.symbol!) ?? q.shortName ?? q.symbol!,
        price: asNumber(q.regularMarketPrice),
        changePercent: asNumber(q.regularMarketChangePercent),
      }));
  } catch (error) {
    console.error("Global ticker fetch failed:", error);
    return [];
  }
}
