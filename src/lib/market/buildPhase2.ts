import { getMarketStatus, formatISTDateTime } from "@/lib/market/ist";
import { fetchUniverseQuotes } from "@/lib/market/yahoo";
import { getSector, NSE_SECTORS, SECTOR_INDEX_QUOTES } from "@/lib/sectors";
import type {
  InsiderRow,
  InsiderStrategyResponse,
  SectorIndexRow,
  SectorScopeResponse,
  SectorStockRow,
  SectorSummary,
  SwingRow,
  SwingSpectrumResponse,
} from "@/lib/phase2-types";
import type { StockQuote } from "@/lib/types";
import { NSE_UNIVERSE } from "@/lib/universe";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  queue: { concurrency: 4, interval: 200 },
  suppressNotices: ["yahooSurvey"],
});

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function relativeVolume(q: StockQuote): number {
  const avg = q.avgVolume10Day || q.avgVolume3Month;
  if (!avg || avg <= 0 || q.volume <= 0) return 0;
  return q.volume / avg;
}

function turnover(q: StockQuote): number {
  return q.ltp * q.volume;
}

function toSectorStock(q: StockQuote): SectorStockRow {
  return {
    symbol: q.symbol,
    sector: getSector(q.symbol),
    ltp: q.ltp,
    changePercent: q.changePercent,
    volume: q.volume,
    turnover: turnover(q),
    relativeVolume: relativeVolume(q),
  };
}

export async function fetchSectorIndices(): Promise<SectorIndexRow[]> {
  try {
    const symbols = SECTOR_INDEX_QUOTES.map((s) => s.yahoo);
    const meta = new Map(
      SECTOR_INDEX_QUOTES.map((s) => [s.yahoo, s] as const),
    );
    const raw = await yahooFinance.quote(symbols, { return: "array" });
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return list
      .filter((q) => q?.symbol && typeof q.regularMarketPrice === "number")
      .map((q) => {
        const m = meta.get(q.symbol!);
        return {
          name: m?.name ?? q.shortName ?? q.symbol!,
          sector: m?.sector ?? "Others",
          symbol: q.symbol!,
          price: asNumber(q.regularMarketPrice),
          changePercent: asNumber(q.regularMarketChangePercent),
        };
      })
      .sort((a, b) => b.changePercent - a.changePercent);
  } catch (error) {
    console.error("Sector index fetch failed:", error);
    return [];
  }
}

function buildSectorSummaries(quotes: StockQuote[]): SectorSummary[] {
  const bySector = new Map<string, StockQuote[]>();
  for (const q of quotes) {
    const sector = getSector(q.symbol);
    const list = bySector.get(sector) ?? [];
    list.push(q);
    bySector.set(sector, list);
  }

  const summaries: SectorSummary[] = [];
  for (const [sector, list] of bySector) {
    const avgChangePercent =
      list.reduce((s, q) => s + q.changePercent, 0) / list.length;
    const totalTurnover = list.reduce((s, q) => s + turnover(q), 0);
    const advancers = list.filter((q) => q.changePercent > 0).length;
    const decliners = list.filter((q) => q.changePercent < 0).length;
    const stocks = [...list]
      .map(toSectorStock)
      .sort((a, b) => b.changePercent - a.changePercent);
    const leaders = [...stocks]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);

    summaries.push({
      sector,
      stockCount: list.length,
      avgChangePercent,
      totalTurnover,
      advancers,
      decliners,
      leaders,
      stocks,
    });
  }

  return summaries.sort((a, b) => {
    const ai = NSE_SECTORS.indexOf(a.sector as (typeof NSE_SECTORS)[number]);
    const bi = NSE_SECTORS.indexOf(b.sector as (typeof NSE_SECTORS)[number]);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    if (ao !== bo) return ao - bo;
    return b.avgChangePercent - a.avgChangePercent;
  });
}

export async function buildSectorScope(): Promise<SectorScopeResponse> {
  const status = getMarketStatus();
  try {
    const [quotes, sectorIndices] = await Promise.all([
      fetchUniverseQuotes(NSE_UNIVERSE),
      fetchSectorIndices(),
    ]);
    const sectors = buildSectorSummaries(quotes);
    const hotStocks = [...quotes]
      .map(toSectorStock)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 25);

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: quotes.length,
      sectorIndices,
      sectors,
      hotStocks,
    };
  } catch (error) {
    console.error("buildSectorScope failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: 0,
      sectorIndices: [],
      sectors: [],
      hotStocks: [],
      error: error instanceof Error ? error.message : "Sector feed interrupted",
    };
  }
}

export async function buildInsiderStrategy(): Promise<InsiderStrategyResponse> {
  const status = getMarketStatus();
  try {
    const quotes = await fetchUniverseQuotes(NSE_UNIVERSE);
    const rows: InsiderRow[] = quotes
      .map((q) => {
        const rVol = relativeVolume(q);
        const to = turnover(q);
        // Unusual volume + meaningful move ≈ institutional footprint proxy
        const score = rVol * (1 + Math.abs(q.changePercent) / 2) * Math.log10(to + 10);
        const signal: InsiderRow["signal"] =
          q.changePercent >= 0 ? "BULL" : "BEAR";
        return {
          symbol: q.symbol,
          sector: getSector(q.symbol),
          ltp: q.ltp,
          changePercent: q.changePercent,
          relativeVolume: rVol,
          turnover: to,
          signal,
          score,
        };
      })
      .filter((r) => r.relativeVolume >= 1.2 && r.turnover > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: quotes.length,
      rows,
    };
  } catch (error) {
    console.error("buildInsiderStrategy failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: 0,
      rows: [],
      error:
        error instanceof Error ? error.message : "Insider feed interrupted",
    };
  }
}

function buildSwingRow(q: StockQuote): SwingRow {
  const pctFromHigh =
    q.fiftyTwoWeekHigh > 0
      ? ((q.ltp - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100
      : 0;
  const pctFromLow =
    q.fiftyTwoWeekLow > 0
      ? ((q.ltp - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100
      : 0;

  let swingBias: SwingRow["swingBias"] = "MID_RANGE";
  if (pctFromHigh > -5) swingBias = "NEAR_HIGH";
  else if (pctFromLow < 15) swingBias = "NEAR_LOW";

  let signal: SwingRow["signal"] = "NEUTRAL";
  if (swingBias === "NEAR_HIGH" && q.changePercent > 0) signal = "BULL";
  else if (swingBias === "NEAR_LOW" && q.changePercent < 0) signal = "BEAR";
  else if (q.changePercent > 1.5) signal = "BULL";
  else if (q.changePercent < -1.5) signal = "BEAR";

  const score =
    Math.abs(q.changePercent) * 2 +
    (swingBias === "NEAR_HIGH" ? 3 : 0) +
    (swingBias === "NEAR_LOW" ? 3 : 0) +
    relativeVolume(q);

  return {
    symbol: q.symbol,
    sector: getSector(q.symbol),
    ltp: q.ltp,
    changePercent: q.changePercent,
    pctFromHigh,
    pctFromLow,
    swingBias,
    signal,
    score,
  };
}

export async function buildSwingSpectrum(): Promise<SwingSpectrumResponse> {
  const status = getMarketStatus();
  try {
    const quotes = await fetchUniverseQuotes(NSE_UNIVERSE);
    const swings = quotes.map(buildSwingRow);

    const nearHigh = [...swings]
      .filter((s) => s.swingBias === "NEAR_HIGH")
      .sort((a, b) => b.pctFromHigh - a.pctFromHigh)
      .slice(0, 20);

    const nearLow = [...swings]
      .filter((s) => s.swingBias === "NEAR_LOW")
      .sort((a, b) => a.pctFromLow - b.pctFromLow)
      .slice(0, 20);

    const momentum = [...swings]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 25);

    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: quotes.length,
      nearHigh,
      nearLow,
      momentum,
    };
  } catch (error) {
    console.error("buildSwingSpectrum failed:", error);
    return {
      asOf: formatISTDateTime(),
      marketStatus: status.status,
      quotesFetched: 0,
      nearHigh: [],
      nearLow: [],
      momentum: [],
      error: error instanceof Error ? error.message : "Swing feed interrupted",
    };
  }
}
