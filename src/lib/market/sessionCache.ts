import type { OpenRange } from "@/lib/market/yahoo";
import { getMarketStatus } from "@/lib/market/ist";

export interface SessionAnchor {
  open15High: number;
  open15Low: number;
  open15Volume: number;
  firedBull: boolean;
  firedBear: boolean;
  bullSignalPercent?: number;
  bearSignalPercent?: number;
  bullTime?: string;
  bearTime?: string;
}

interface SessionState {
  sessionDate: string;
  anchors: Map<string, SessionAnchor>;
}

declare global {
  // eslint-disable-next-line no-var
  var __tradefinderSession: SessionState | undefined;
}

function getState(): SessionState {
  const status = getMarketStatus();
  if (
    !globalThis.__tradefinderSession ||
    globalThis.__tradefinderSession.sessionDate !== status.sessionDate
  ) {
    globalThis.__tradefinderSession = {
      sessionDate: status.sessionDate,
      anchors: new Map(),
    };
  }
  return globalThis.__tradefinderSession;
}

export function getAnchor(symbol: string): SessionAnchor | undefined {
  return getState().anchors.get(symbol);
}

export function ensureAnchor(
  symbol: string,
  range: OpenRange,
): SessionAnchor {
  const state = getState();
  const existing = state.anchors.get(symbol);
  if (existing) return existing;

  const anchor: SessionAnchor = {
    open15High: range.high,
    open15Low: range.low,
    open15Volume: range.volume,
    firedBull: false,
    firedBear: false,
  };
  state.anchors.set(symbol, anchor);
  return anchor;
}

export function markBreakout(
  symbol: string,
  side: "BULL" | "BEAR",
  signalPercent: number,
  time: string,
): void {
  const anchor = getState().anchors.get(symbol);
  if (!anchor) return;
  if (side === "BULL") {
    anchor.firedBull = true;
    anchor.bullSignalPercent = signalPercent;
    anchor.bullTime = time;
  } else {
    anchor.firedBear = true;
    anchor.bearSignalPercent = signalPercent;
    anchor.bearTime = time;
  }
}

export function getSessionDate(): string {
  return getState().sessionDate;
}

export function getAnchoredCount(): number {
  return getState().anchors.size;
}
