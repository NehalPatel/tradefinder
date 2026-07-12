# TradeFinder Market Pulse (Phase 1)

Live NSE Market Pulse dashboard clone. Scanners use real Yahoo Finance quotes for a curated F&O / liquid universe — no mock rows.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

- Quotes: Yahoo Finance (`SYMBOL.NS`) via server Route Handlers
- Universe: ~180 NSE symbols in `src/lib/universe.ts`
- Breakouts: first 15m candle high/low + volume vs expected session volume
- Outside market hours: last available exchange-derived quotes; status shows Market Closed

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
