import YahooFinance from "yahoo-finance2";
import { getMarketStatus, formatISTDateTime, istDateKey, formatISTClock } from "@/lib/market/ist";
import { fetchUniverseQuotes } from "@/lib/market/yahoo";
import { getSector } from "@/lib/sectors";
import type {
  ApexLeg,
  ClockSlot,
  IndexDriverRow,
  IndexMoverResponse,
  IndexQuoteRow,
  OptionApexResponse,
  OptionClockResponse,
} from "@/lib/phase3-types";
import { NSE_UNIVERSE } from "@/lib/universe";

const yahooFinance = new YahooFinance({
  queue: { concurrency: 4, interval: 200 },
  suppressNotices: ["yahooSurvey"],
});

const INDEX_LIST = [
  { yahoo: "^NSEI", name: "Nifty 50" },
  { yahoo: "^NSEBANK", name: "Nifty Bank" },
  { yahoo: "^BSESN", name: "Sensex" },
  { yahoo: "NIFTY_FIN_SERVICE.NS", name: "FinNifty" },
  { yahoo: "^CNXIT", name: "Nifty IT" },
  { yahoo: "^CNXAUTO", name: "Nifty Auto" },
  { yahoo: "^CNXPHARMA", name: "Nifty Pharma" },
  { yahoo: "^CNXMETAL", name: "Nifty Metal" },
  { yahoo: "^INDIAVIX", name: "India VIX" },
] as const;

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function buildIndexMover(): Promise<IndexMoverResponse> {
  const status = getMarketStatus();
  try {
    const [rawIdx, quotes] = await Promise.all([
      yahooFinance.quote(
        INDEX_LIST.map((i) => i.yahoo),
        { return: "array" },
      ),
      fetchUniverseQuotes(NSE_UNIVERSE),
    ]);

    const list = Array.isArray(rawIdx) ? rawIdx : rawIdx ? [rawIdx] : [];
    const nameBy = new Map(INDEX_LIST.map((i) => [i.yahoo, i.name]));

    const indices: IndexQuoteRow[] = list
      .filter((q) => q?.symbol && typeof q.regularMarketPrice === "number")
      .map((q) => ({
        symbol: q.symbol!,
        name: nameBy.get(q.symbol!) ?? q.shortName ?? q.symbol!,
        price: asNumber(q.regularMarketPrice),
        changePercent: asNumber(q.regularMarketChangePercent),
        dayHigh: asNumber(q.regularMarketDayHigh),
        dayLow: asNumber(q.regularMarketDayLow),
      }))
      .sort((a, b) => b.changePercent - a.changePercent);

    const drivers: IndexDriverRow[] = quotes.map((q) => ({
      symbol: q.symbol,
      sector: getSector(q.symbol),
      ltp: q.ltp,
      changePercent: q.changePercent,
      turnover: q.ltp * q.volume,
      contributionBias: q.changePercent >= 0 ? "UP" : "DOWN",
    }));

    const topDriversUp = [...drivers]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 15);
    const topDriversDown = [...drivers]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 15);

    const advancers = quotes.filter((q) => q.changePercent > 0).length;
    const decliners = quotes.filter((q) => q.changePercent < 0).length;

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      indices,
      topDriversUp,
      topDriversDown,
      breadth: {
        advancers,
        decliners,
        unchanged: quotes.length - advancers - decliners,
      },
    };
  } catch (error) {
    console.error("buildIndexMover failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      indices: [],
      topDriversUp: [],
      topDriversDown: [],
      breadth: { advancers: 0, decliners: 0, unchanged: 0 },
      error:
        error instanceof Error ? error.message : "Index mover feed interrupted",
    };
  }
}

async function fetchLatestSessionBars(yahooSymbol: string) {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - 5 * 24 * 60 * 60 * 1000);
  const chart = await yahooFinance.chart(yahooSymbol, {
    period1,
    period2,
    interval: "15m",
    return: "array",
  });

  const quotes = (chart?.quotes ?? []).filter(
    (c) =>
      c &&
      c.date instanceof Date &&
      typeof c.open === "number" &&
      typeof c.close === "number",
  );

  const byDay = new Map<string, typeof quotes>();
  for (const bar of quotes) {
    const key = istDateKey(bar.date!);
    const list = byDay.get(key) ?? [];
    list.push(bar);
    byDay.set(key, list);
  }
  const days = [...byDay.keys()].sort();
  const latest = days[days.length - 1];
  return (byDay.get(latest) ?? []).sort(
    (a, b) => a.date!.getTime() - b.date!.getTime(),
  );
}

function barsToSlots(
  bars: Awaited<ReturnType<typeof fetchLatestSessionBars>>,
): ClockSlot[] {
  if (!bars.length) return [];
  const sessionOpen = asNumber(bars[0].open);
  return bars.map((bar) => {
    const open = asNumber(bar.open);
    const close = asNumber(bar.close);
    const changePercent = open ? ((close - open) / open) * 100 : 0;
    const cumulativeFromOpen = sessionOpen
      ? ((close - sessionOpen) / sessionOpen) * 100
      : 0;
    let bias: ClockSlot["bias"] = "FLAT";
    if (changePercent > 0.05) bias = "BULL";
    else if (changePercent < -0.05) bias = "BEAR";
    return {
      time: formatISTClock(bar.date!),
      open,
      high: asNumber(bar.high, close),
      low: asNumber(bar.low, close),
      close,
      changePercent,
      bias,
      cumulativeFromOpen,
    };
  });
}

export async function buildOptionClock(
  underlying: "^NSEI" | "^NSEBANK" = "^NSEI",
): Promise<OptionClockResponse> {
  const status = getMarketStatus();
  const name = underlying === "^NSEBANK" ? "Nifty Bank" : "Nifty 50";
  try {
    const [quoteRaw, bars] = await Promise.all([
      yahooFinance.quote(underlying),
      fetchLatestSessionBars(underlying),
    ]);
    const slots = barsToSlots(bars);

    let bestLongWindow: string | null = null;
    let bestShortWindow: string | null = null;
    let maxUp = 0;
    let maxDown = 0;
    for (const s of slots) {
      if (s.changePercent > maxUp) {
        maxUp = s.changePercent;
        bestLongWindow = s.time;
      }
      if (s.changePercent < maxDown) {
        maxDown = s.changePercent;
        bestShortWindow = s.time;
      }
    }

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      underlying: name,
      underlyingPrice: asNumber(quoteRaw?.regularMarketPrice),
      underlyingChangePercent: asNumber(quoteRaw?.regularMarketChangePercent),
      bestLongWindow,
      bestShortWindow,
      slots,
      note: "Yahoo does not provide NSE option OI chains. Clock uses live 15m underlying bars to time option entries.",
    };
  } catch (error) {
    console.error("buildOptionClock failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      underlying: name,
      underlyingPrice: 0,
      underlyingChangePercent: 0,
      bestLongWindow: null,
      bestShortWindow: null,
      slots: [],
      note: "Yahoo does not provide NSE option OI chains. Clock uses live 15m underlying bars to time option entries.",
      error:
        error instanceof Error ? error.message : "Option clock feed interrupted",
    };
  }
}

export async function buildOptionApex(): Promise<OptionApexResponse> {
  const status = getMarketStatus();
  const note =
    "NSE CE/PE OI is not on Yahoo. Apex bias is derived from Nifty 15m structure + India VIX (real quotes only).";

  try {
    const [niftyQ, bankQ, vixQ, bars] = await Promise.all([
      yahooFinance.quote("^NSEI"),
      yahooFinance.quote("^NSEBANK"),
      yahooFinance.quote("^INDIAVIX"),
      fetchLatestSessionBars("^NSEI"),
    ]);

    const nifty = {
      price: asNumber(niftyQ?.regularMarketPrice),
      changePercent: asNumber(niftyQ?.regularMarketChangePercent),
    };
    const bankNifty = {
      price: asNumber(bankQ?.regularMarketPrice),
      changePercent: asNumber(bankQ?.regularMarketChangePercent),
    };
    const indiaVix = {
      price: asNumber(vixQ?.regularMarketPrice),
      changePercent: asNumber(vixQ?.regularMarketChangePercent),
    };

    let vixRegime: OptionApexResponse["vixRegime"] = "NORMAL";
    if (indiaVix.price > 0 && indiaVix.price < 13) vixRegime = "LOW";
    else if (indiaVix.price >= 18) vixRegime = "ELEVATED";

    const legs: ApexLeg[] = barsToSlots(bars).map((s) => {
      const callLean = s.bias === "BULL" ? Math.abs(s.changePercent) : 0;
      const putLean = s.bias === "BEAR" ? Math.abs(s.changePercent) : 0;
      let netBias: ApexLeg["netBias"] = "NEUTRAL";
      if (callLean > putLean + 0.02) netBias = "CALL";
      else if (putLean > callLean + 0.02) netBias = "PUT";
      return {
        time: s.time,
        callLean,
        putLean,
        netBias,
        indexClose: s.close,
        changePercent: s.changePercent,
      };
    });

    const callScore = legs.reduce((a, l) => a + l.callLean, 0);
    const putScore = legs.reduce((a, l) => a + l.putLean, 0);
    let biasScore = Math.round((callScore - putScore) * 40 + nifty.changePercent * 10);
    if (indiaVix.changePercent < -3) biasScore += 5; // VIX crush often with directional bullish grind
    if (indiaVix.changePercent > 5) biasScore -= 5;

    let bias: OptionApexResponse["bias"] = "NEUTRAL";
    if (biasScore >= 8) bias = "CALL";
    else if (biasScore <= -8) bias = "PUT";

    const summary =
      bias === "CALL"
        ? `Call-leaning session — Nifty ${nifty.changePercent >= 0 ? "+" : ""}${nifty.changePercent.toFixed(2)}%, VIX ${indiaVix.price.toFixed(2)} (${vixRegime})`
        : bias === "PUT"
          ? `Put-leaning session — Nifty ${nifty.changePercent >= 0 ? "+" : ""}${nifty.changePercent.toFixed(2)}%, VIX ${indiaVix.price.toFixed(2)} (${vixRegime})`
          : `Neutral options bias — wait for clearer 15m structure; VIX ${indiaVix.price.toFixed(2)} (${vixRegime})`;

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      nifty,
      bankNifty,
      indiaVix,
      vixRegime,
      bias,
      biasScore,
      summary,
      legs,
      note,
    };
  } catch (error) {
    console.error("buildOptionApex failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      nifty: { price: 0, changePercent: 0 },
      bankNifty: { price: 0, changePercent: 0 },
      indiaVix: { price: 0, changePercent: 0 },
      vixRegime: "NORMAL",
      bias: "NEUTRAL",
      biasScore: 0,
      summary: "Unable to load apex bias",
      legs: [],
      note,
      error:
        error instanceof Error ? error.message : "Option apex feed interrupted",
    };
  }
}
