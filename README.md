# TradeFinder (Phase 1–3)

Live NSE scanner dashboard clone. All rows come from Yahoo Finance — no mock data.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Trade Desk (`/` → `/trade-desk`)
Ranked **ENTER / WAIT** equity setups with entry zone, invalidation, target, and confluence reasons.

### Phase 1 — Market Pulse (`/market-pulse`)
Breakout Beacon, Intraday Boost, Top/Low Level, Leaders Matrix

### Phase 2 — Stocks tools
- **Insider Strategy** (`/insider-strategy`) — unusual volume + turnover footprint
- **Sector Scope** (`/sector-scope`) — sector indices, sector momentum, hot stocks
- **Swing Spectrum** (`/swing-spectrum`) — near 52W high/low + session momentum

### Phase 3 — Index tools
- **Option Clock** (`/option-clock`) — 15m Nifty/BankNifty session clock for option timing
- **Option Apex** (`/option-apex`) — call/put lean from 15m structure + India VIX
- **Index Mover** (`/index-mover`) — index board + breadth drivers

> Note: Yahoo does not expose NSE option OI chains. Clock/Apex use real underlying + VIX data (no fabricated OI).

## Data

- Quotes: Yahoo Finance (`SYMBOL.NS` / index symbols) via server Route Handlers
- Universe: NSE symbols in `src/lib/universe.ts`
- Outside market hours: last available exchange-derived quotes

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
