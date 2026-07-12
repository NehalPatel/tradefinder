# TradeFinder (Phase 1–2)

Live NSE scanner dashboard clone. All rows come from Yahoo Finance — no mock data.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Phase 3 — Trade Desk (`/` → `/trade-desk`)
Ranked **ENTER / WAIT** equity setups with entry zone, invalidation, target, and confluence reasons.

### Phase 1 — Market Pulse (`/market-pulse`)
Breakout Beacon, Intraday Boost, Top/Low Level, Leaders Matrix

### Phase 2 — Stocks tools
- **Insider Strategy** (`/insider-strategy`) — unusual volume + turnover footprint
- **Sector Scope** (`/sector-scope`) — sector indices, sector momentum, hot stocks
- **Swing Spectrum** (`/swing-spectrum`) — near 52W high/low + session momentum

Index tools (Option Clock / Apex / Index Mover) remain later.

## Data

- Quotes: Yahoo Finance (`SYMBOL.NS`) via server Route Handlers
- Universe: NSE symbols in `src/lib/universe.ts`
- Outside market hours: last available exchange-derived quotes

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
