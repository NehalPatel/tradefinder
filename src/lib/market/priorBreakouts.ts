import YahooFinance from "yahoo-finance2";
import { expectedVolumeAtProgress } from "@/utils/algorithms";
import {
  formatISTClock,
  getMarketStatus,
  istDateKey,
} from "@/lib/market/ist";
import { toYahooSymbol } from "@/lib/universe";
import type { BreakoutRow, StockQuote } from "@/lib/types";

const yahooFinance = new YahooFinance({
  queue: { concurrency: 4, interval: 200 },
  suppressNotices: ["yahooSurvey"],
});

const PRIOR_BATCH = 20;
const SESSION_BARS_TARGET = 25; // ~15m * 25 ≈ full cash session

interface Candle {
  date: Date;
  high: number;
  low: number;
  close: number;
  open: number;
  volume: number;
}

interface PriorBreakoutState {
  forSessionDate: string;
  priorDate: string;
  rows: BreakoutRow[];
  scanned: Set<string>;
  complete: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __tradefinderPriorBreakouts: PriorBreakoutState | undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getPriorState(sessionDate: string): PriorBreakoutState {
  if (
    !globalThis.__tradefinderPriorBreakouts ||
    globalThis.__tradefinderPriorBreakouts.forSessionDate !== sessionDate
  ) {
    globalThis.__tradefinderPriorBreakouts = {
      forSessionDate: sessionDate,
      priorDate: "",
      rows: [],
      scanned: new Set(),
      complete: false,
    };
  }
  return globalThis.__tradefinderPriorBreakouts;
}

async function fetchFifteenMinBars(yahooSymbol: string): Promise<Candle[]> {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - 7 * 24 * 60 * 60 * 1000);

  const chart = await yahooFinance.chart(yahooSymbol, {
    period1,
    period2,
    interval: "15m",
    return: "array",
  });

  return (chart?.quotes ?? [])
    .filter(
      (c): c is NonNullable<typeof c> =>
        !!c &&
        c.date instanceof Date &&
        typeof c.high === "number" &&
        typeof c.low === "number" &&
        typeof c.close === "number",
    )
    .map((c) => ({
      date: c.date!,
      high: c.high!,
      low: c.low!,
      close: c.close!,
      open: asNumber(c.open, c.close!),
      volume: asNumber(c.volume),
    }));
}

function groupByIstDay(bars: Candle[]): Map<string, Candle[]> {
  const map = new Map<string, Candle[]>();
  for (const bar of bars) {
    const key = istDateKey(bar.date);
    const list = map.get(key) ?? [];
    list.push(bar);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  return map;
}

/** Prefer the trading day before the current IST session date when available. */
function resolvePriorDay(
  dayKeys: string[],
  sessionDate: string,
): string | null {
  const sorted = [...dayKeys].sort();
  if (!sorted.length) return null;

  const before = sorted.filter((d) => d < sessionDate);
  if (before.length) return before[before.length - 1];

  // Weekend / holiday: Yahoo's latest bar day is the last session.
  if (sorted[sorted.length - 1] !== sessionDate) {
    return sorted[sorted.length - 1];
  }

  // Same calendar day as "session" but we want prior — use second-latest.
  if (sorted.length >= 2) return sorted[sorted.length - 2];
  return sorted[sorted.length - 1];
}

function detectBreakoutsOnDay(
  symbol: string,
  dayBars: Candle[],
  avgDailyVolume: number,
  sessionDate: string,
): BreakoutRow[] {
  if (dayBars.length < 2) return [];

  const openBar = dayBars[0];
  const open15High = openBar.high;
  const open15Low = openBar.low;
  const dayOpen = openBar.open;

  let cumVol = 0;
  let firedBull = false;
  let firedBear = false;
  const rows: BreakoutRow[] = [];

  for (let i = 0; i < dayBars.length; i++) {
    const bar = dayBars[i];
    cumVol += bar.volume;
    const progress = Math.min(1, (i + 1) / SESSION_BARS_TARGET);
    const expected = expectedVolumeAtProgress(avgDailyVolume, progress);
    const volumeOk = expected > 0 && cumVol > 2 * expected;

    if (!volumeOk) continue;

    const changeFromOpen =
      dayOpen > 0 ? ((bar.close - dayOpen) / dayOpen) * 100 : 0;

    if (!firedBull && bar.high > open15High) {
      firedBull = true;
      rows.push({
        signal: "BULL",
        symbol,
        changePercent: changeFromOpen,
        signalPercent: changeFromOpen,
        time: formatISTClock(bar.date),
        source: "prior",
        sessionDate,
      });
    }

    if (!firedBear && bar.low < open15Low) {
      firedBear = true;
      rows.push({
        signal: "BEAR",
        symbol,
        changePercent: changeFromOpen,
        signalPercent: changeFromOpen,
        time: formatISTClock(bar.date),
        source: "prior",
        sessionDate,
      });
    }

    if (firedBull && firedBear) break;
  }

  return rows;
}

/**
 * Incrementally scan the universe for prior trading-day open-range breakouts.
 * Results are cached in-process for the current IST session date.
 */
export async function getPriorDayBreakouts(
  quotes: StockQuote[],
): Promise<{ rows: BreakoutRow[]; priorDate: string }> {
  const { sessionDate } = getMarketStatus();
  const state = getPriorState(sessionDate);

  if (state.complete && state.rows.length > 0) {
    return { rows: state.rows, priorDate: state.priorDate };
  }

  const pending = [...quotes]
    .filter((q) => !state.scanned.has(q.symbol))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const batch = pending.slice(0, PRIOR_BATCH);

  await Promise.all(
    batch.map(async (q) => {
      state.scanned.add(q.symbol);
      try {
        const bars = await fetchFifteenMinBars(toYahooSymbol(q.symbol));
        const byDay = groupByIstDay(bars);
        const priorDate = resolvePriorDay([...byDay.keys()], sessionDate);
        if (!priorDate) return;

        if (!state.priorDate) state.priorDate = priorDate;

        const dayBars = byDay.get(priorDate);
        if (!dayBars?.length) return;

        const avg = q.avgVolume10Day || q.avgVolume3Month || 0;
        const found = detectBreakoutsOnDay(
          q.symbol,
          dayBars,
          avg,
          priorDate,
        );
        if (found.length) {
          state.rows.push(...found);
        }
      } catch (error) {
        console.error("Prior breakout scan failed:", q.symbol, error);
      }
    }),
  );

  state.rows.sort(
    (a, b) => Math.abs(b.signalPercent) - Math.abs(a.signalPercent),
  );

  if (state.scanned.size >= quotes.length || state.rows.length >= 40) {
    state.complete = true;
  }

  return { rows: state.rows.slice(0, 40), priorDate: state.priorDate };
}
