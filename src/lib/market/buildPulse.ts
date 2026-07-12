import {
  buildIntradayBoost,
  buildLeaders,
  buildLowLevel,
  buildTopLevel,
  collectBreakoutRows,
} from "@/utils/algorithms";
import { getMarketStatus, formatISTDateTime } from "@/lib/market/ist";
import {
  ensureAnchor,
  getAnchor,
  getAnchoredCount,
} from "@/lib/market/sessionCache";
import { getPriorDayBreakouts } from "@/lib/market/priorBreakouts";
import {
  fetchOpen15Range,
  fetchUniverseQuotes,
  type OpenRange,
} from "@/lib/market/yahoo";
import { NSE_UNIVERSE, toYahooSymbol } from "@/lib/universe";
import type { MarketPulseResponse, StockQuote } from "@/lib/types";

const OPEN15_BATCH_PER_REQUEST = 25;

async function hydrateOpenRanges(
  quotes: StockQuote[],
): Promise<Map<string, OpenRange>> {
  const map = new Map<string, OpenRange>();
  const missing: StockQuote[] = [];

  for (const q of quotes) {
    const existing = getAnchor(q.symbol);
    if (existing) {
      map.set(q.symbol, {
        high: existing.open15High,
        low: existing.open15Low,
        volume: existing.open15Volume,
      });
    } else {
      missing.push(q);
    }
  }

  const batch = missing.slice(0, OPEN15_BATCH_PER_REQUEST);
  await Promise.all(
    batch.map(async (q) => {
      const range = await fetchOpen15Range(toYahooSymbol(q.symbol));
      if (!range) return;
      ensureAnchor(q.symbol, range);
      map.set(q.symbol, range);
    }),
  );

  return map;
}

export async function buildMarketPulse(): Promise<MarketPulseResponse> {
  const status = getMarketStatus();

  const empty = (): MarketPulseResponse => ({
    asOf: formatISTDateTime(),
    marketOpen: status.marketOpen,
    marketStatus: status.status,
    universeSize: NSE_UNIVERSE.length,
    quotesFetched: 0,
    breakouts: [],
    breakoutsSource: "live",
    intradayBoost: [],
    topLevel: [],
    lowLevel: [],
    topGainers: [],
    topLosers: [],
    highPower: [],
  });

  try {
    const quotes = await fetchUniverseQuotes(NSE_UNIVERSE);
    const openRanges = await hydrateOpenRanges(quotes);

    const sessionProgress =
      status.sessionProgress ||
      (status.status === "closed" && status.minutesSinceOpen > 0 ? 1 : 0.5);

    let breakouts = collectBreakoutRows(
      quotes,
      openRanges,
      sessionProgress,
    );
    let breakoutsSource: "live" | "prior" = "live";
    let breakoutsSessionDate: string | undefined = status.sessionDate;

    if (breakouts.length === 0) {
      const prior = await getPriorDayBreakouts(quotes);
      if (prior.rows.length > 0) {
        breakouts = prior.rows;
        breakoutsSource = "prior";
        breakoutsSessionDate = prior.priorDate;
      }
    }

    const intradayBoost = buildIntradayBoost(quotes, sessionProgress);
    const topLevel = buildTopLevel(quotes);
    const lowLevel = buildLowLevel(quotes);
    const leaders = buildLeaders(quotes);

    return {
      asOf: formatISTDateTime(),
      marketOpen: status.marketOpen,
      marketStatus: status.status,
      universeSize: NSE_UNIVERSE.length,
      quotesFetched: quotes.length,
      breakouts,
      breakoutsSource,
      breakoutsSessionDate,
      intradayBoost,
      topLevel,
      lowLevel,
      topGainers: leaders.topGainers,
      topLosers: leaders.topLosers,
      highPower: leaders.highPower,
    };
  } catch (error) {
    console.error("buildMarketPulse failed:", error);
    return {
      ...empty(),
      error:
        error instanceof Error
          ? error.message
          : "Market feed interrupted",
    };
  }
}

export function pulseMeta() {
  return {
    anchored: getAnchoredCount(),
    universe: NSE_UNIVERSE.length,
  };
}
