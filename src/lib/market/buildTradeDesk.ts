import {
  computeRFactor,
  expectedVolumeAtProgress,
} from "@/utils/algorithms";
import { getMarketStatus, formatISTDateTime } from "@/lib/market/ist";
import {
  ensureAnchor,
  getAnchor,
} from "@/lib/market/sessionCache";
import {
  fetchOpen15Range,
  fetchUniverseQuotes,
  type OpenRange,
} from "@/lib/market/yahoo";
import { getSector } from "@/lib/sectors";
import type {
  TradeAction,
  TradeDeskResponse,
  TradeSetup,
  TradeSide,
} from "@/lib/trade-desk-types";
import type { StockQuote } from "@/lib/types";
import { NSE_UNIVERSE, toYahooSymbol } from "@/lib/universe";

const OPEN15_BATCH = 40;
const CHASE_PCT = 2.5;
const ENTER_MIN = 70;
const WAIT_MIN = 45;

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

  const batch = missing.slice(0, OPEN15_BATCH);
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

function relativeVolume(q: StockQuote): number {
  const avg = q.avgVolume10Day || q.avgVolume3Month;
  if (!avg || avg <= 0 || q.volume <= 0) return 0;
  return q.volume / avg;
}

function buildSectorAvg(quotes: StockQuote[]): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const q of quotes) {
    const sector = getSector(q.symbol);
    const list = buckets.get(sector) ?? [];
    list.push(q.changePercent);
    buckets.set(sector, list);
  }
  const avgs = new Map<string, number>();
  for (const [sector, vals] of buckets) {
    avgs.set(sector, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return avgs;
}

function isActionableWindow(status: ReturnType<typeof getMarketStatus>): boolean {
  if (!status.marketOpen) return false;
  // ~09:20–14:45 IST → minutes since 09:15 between 5 and 330
  return status.minutesSinceOpen >= 5 && status.minutesSinceOpen <= 330;
}

function scoreSetup(
  q: StockQuote,
  range: OpenRange | undefined,
  sectorAvg: number,
  sessionProgress: number,
  actionableWindow: boolean,
  marketOpen: boolean,
): TradeSetup | null {
  const sector = getSector(q.symbol);
  const rFac = computeRFactor(q, sessionProgress);
  const rVol = relativeVolume(q);
  const avg = q.avgVolume10Day || q.avgVolume3Month || 0;
  const expected = expectedVolumeAtProgress(avg, sessionProgress);
  const volumeOk =
    (rFac >= 1.5 || rVol >= 1.5) &&
    (expected <= 0 || q.volume > expected);

  const longBreak =
    !!range && (q.dayHigh > range.high || q.ltp > range.high);
  const shortBreak =
    !!range && (q.dayLow < range.low || q.ltp < range.low);

  let side: TradeSide | null = null;
  if (longBreak && !shortBreak) side = "LONG";
  else if (shortBreak && !longBreak) side = "SHORT";
  else if (longBreak && shortBreak) {
    // Prefer direction of current session move
    side = q.changePercent >= 0 ? "LONG" : "SHORT";
  } else if (q.changePercent >= 1.2 && volumeOk) {
    side = "LONG";
  } else if (q.changePercent <= -1.2 && volumeOk) {
    side = "SHORT";
  }

  if (!side) return null;

  const sectorAligned =
    (side === "LONG" && sectorAvg > 0.15) ||
    (side === "SHORT" && sectorAvg < -0.15);

  const sectorConflict =
    (side === "LONG" && sectorAvg < -0.35) ||
    (side === "SHORT" && sectorAvg > 0.35);

  const moveFromOpen =
    q.open > 0 ? ((q.ltp - q.open) / q.open) * 100 : q.changePercent;
  const extended =
    side === "LONG"
      ? moveFromOpen >= CHASE_PCT
      : moveFromOpen <= -CHASE_PCT;

  const nearBreakLevel =
    !!range &&
    (side === "LONG"
      ? Math.abs(q.ltp - range.high) / range.high <= 0.008
      : Math.abs(q.ltp - range.low) / range.low <= 0.008);

  let score = 0;
  const reasons: string[] = [];

  if (longBreak || shortBreak) {
    score += 30;
    reasons.push(
      side === "LONG"
        ? `Broke open-range high ${range!.high.toFixed(2)}`
        : `Broke open-range low ${range!.low.toFixed(2)}`,
    );
  } else {
    score += 10;
    reasons.push(
      `Momentum ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}% without clean open-range break`,
    );
  }

  if (volumeOk) {
    score += 20;
    reasons.push(
      `Volume confirmation R.Fac ${rFac.toFixed(2)} · R.Vol ${rVol.toFixed(2)}×`,
    );
  } else {
    reasons.push("Volume not confirmed yet — wait for participation");
  }

  if (sectorAligned) {
    score += 20;
    reasons.push(
      `Sector ${sector} aligned (${sectorAvg >= 0 ? "+" : ""}${sectorAvg.toFixed(2)}% avg)`,
    );
  } else if (sectorConflict) {
    score -= 15;
    reasons.push(
      `Sector ${sector} conflicting (${sectorAvg >= 0 ? "+" : ""}${sectorAvg.toFixed(2)}% avg)`,
    );
  } else {
    score += 5;
    reasons.push(`Sector ${sector} neutral`);
  }

  if (!extended) {
    score += 15;
    reasons.push("Not over-extended from open — entry still reasonable");
  } else {
    score -= 10;
    reasons.push(
      `Extended ${Math.abs(moveFromOpen).toFixed(1)}% from open — chase risk`,
    );
  }

  if (actionableWindow) {
    score += 15;
    reasons.push("Inside actionable session window (≈09:20–14:45 IST)");
  } else if (marketOpen) {
    score -= 5;
    reasons.push("Outside preferred entry window — prefer wait / reduce size");
  } else {
    reasons.push("Market closed — prep levels for next session");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const entryAnchor = range
    ? side === "LONG"
      ? range.high
      : range.low
    : q.ltp;

  const entryLow =
    side === "LONG" ? entryAnchor * 0.998 : entryAnchor * 0.997;
  const entryHigh =
    side === "LONG" ? entryAnchor * 1.003 : entryAnchor * 1.002;

  const invalidation = range
    ? side === "LONG"
      ? Math.min(range.low, q.open || range.low)
      : Math.max(range.high, q.open || range.high)
    : side === "LONG"
      ? q.dayLow || q.ltp * 0.99
      : q.dayHigh || q.ltp * 1.01;

  const risk = Math.abs(q.ltp - invalidation);
  const target =
    side === "LONG" ? q.ltp + risk * 2 : q.ltp - risk * 2;

  let action: TradeAction = "AVOID";
  let when = "Too late / avoid chase";

  if (sectorConflict || score < WAIT_MIN) {
    action = "AVOID";
    when = sectorConflict
      ? "Avoid — sector conflict"
      : "Avoid — weak confluence";
  } else if (
    score >= ENTER_MIN &&
    volumeOk &&
    sectorAligned &&
    !extended &&
    (actionableWindow || !marketOpen)
  ) {
    // When closed, still label ENTER as "prep / watchlist priority"
    action = "ENTER";
    when = marketOpen
      ? nearBreakLevel
        ? "Act now — price near break level"
        : "Act now — confluence ready"
      : "Prep — top watch for next open";
  } else if (score >= WAIT_MIN) {
    action = "WAIT";
    if (!volumeOk) {
      when = `Wait for volume ≥ 1.5× at ${entryAnchor.toFixed(2)}`;
    } else if (extended) {
      when = `Wait for retest of ${entryAnchor.toFixed(2)}`;
    } else if (!sectorAligned) {
      when = "Wait — need sector confirmation";
    } else if (!actionableWindow && marketOpen) {
      when = "Wait — outside actionable window";
    } else {
      when = `Wait for retest of ${entryAnchor.toFixed(2)}`;
    }
  }

  // Drop pure AVOIDs from card generation caller; still return for counting
  return {
    action,
    side,
    symbol: q.symbol,
    sector,
    score,
    ltp: q.ltp,
    changePercent: q.changePercent,
    entryLow,
    entryHigh,
    invalidation,
    target,
    when,
    reasons: reasons.slice(0, 5),
    rFactor: rFac,
    relativeVolume: rVol,
  };
}

export async function buildTradeDesk(): Promise<TradeDeskResponse> {
  const status = getMarketStatus();
  const actionableWindow = isActionableWindow(status);

  try {
    const quotes = await fetchUniverseQuotes(NSE_UNIVERSE);
    const openRanges = await hydrateOpenRanges(quotes);
    const sectorAvgs = buildSectorAvg(quotes);

    const sessionProgress =
      status.sessionProgress ||
      (status.status === "closed" && status.minutesSinceOpen > 0 ? 1 : 0.5);

    const setups: TradeSetup[] = [];
    let avoidCount = 0;

    for (const q of quotes) {
      const setup = scoreSetup(
        q,
        openRanges.get(q.symbol),
        sectorAvgs.get(getSector(q.symbol)) ?? 0,
        sessionProgress,
        actionableWindow,
        status.marketOpen,
      );
      if (!setup) continue;
      if (setup.action === "AVOID") {
        avoidCount += 1;
        continue;
      }
      setups.push(setup);
    }

    setups.sort((a, b) => b.score - a.score);

    const enter = setups.filter((s) => s.action === "ENTER").slice(0, 5);
    const wait = setups.filter((s) => s.action === "WAIT").slice(0, 5);

    return {
      asOf: formatISTDateTime(),
      marketOpen: status.marketOpen,
      marketStatus: status.status,
      sessionDate: status.sessionDate,
      quotesFetched: quotes.length,
      actionableWindow,
      enter,
      wait,
      avoidCount,
      banner: status.marketOpen
        ? undefined
        : "Session closed — prep for next open (levels from last available quotes)",
    };
  } catch (error) {
    console.error("buildTradeDesk failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketOpen: status.marketOpen,
      marketStatus: status.status,
      sessionDate: status.sessionDate,
      quotesFetched: 0,
      actionableWindow,
      enter: [],
      wait: [],
      avoidCount: 0,
      error:
        error instanceof Error ? error.message : "Trade desk feed interrupted",
    };
  }
}
