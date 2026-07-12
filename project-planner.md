Here is a comprehensive specification document tailored for your CursorAI editor. It outlines the project structure, design guidelines (matching the dark-themed UI visible in your active viewport), data flow using real-time market data providers, and core scanner algorithms.

Save the content below into a file named `.cursorrules` or `CLONE_INSTRUCTIONS.md` at the root of your project directory so CursorAI can build it out cleanly.

````markdown
# Project Specification: TradeFinder Clone (Live Market Scanner)

## Project Overview

You are building a live market scanner dashboard clone based on the TradeFinder UI. The application is a real-time analytics web dashboard optimized for stock and index traders, highlighting intraday breakouts, volume bursts, and market leaders/laggards.

### Tech Stack

- **Frontend:** Next.js (App Router), React, TailwindCSS, Lucide React (Icons)
- **State Management & Data Fetching:** React Query (TanStack Query) + WebSockets
- **Data Visualization:** Recharts or Lightweight Charts (TradingView)
- **Market Data Provider:** Yahoo Finance API (RapidAPI), Alpha Vantage, or Twelvedata (supporting WebSockets or frequent polling for live values).

---

## Architecture & File Structure

Generate the project according to this structure:

```text
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx         # Main Market Pulse Dashboard
│   ├── components/
│   │   ├── ui/
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── badge.tsx
│   │   ├── Sidebar.tsx      # Navigation for Stocks & Indices sections
│   │   ├── GlobalTicker.tsx # Top scrolling marquee for global index pairs
│   │   └── ScannerGrid.tsx  # Dynamic multi-column layout for blocks
│   ├── hooks/
│   │   └── useMarketData.ts # Custom hook handling API polling/WS pipelines
│   └── utils/
│       └── algorithms.ts    # Computations for Breakouts and Intraday Boost
```
````

---

## UI & Design Specifications (Theme: Dark Slate/Navy)

Apply the exact color palette and visual styling extracted from the target viewport:

- **Backgrounds:** Primary: Deep Navy/Slate Black (`#12131a`), Cards/Panels: Surface Dark Grey (`#1b1c24`)
- **Typography:** Inter or Roboto sans-serif. Muted values: `#7e8494`, Accent text/numbers: White (`#ffffff`)
- **Accents:**
- Bullish / Green Badge: Background `#22c55e` at 15% opacity, text `#4ade80`
- Bearish / Red Badge: Background `#ef4444` at 15% opacity, text `#f87171`

- **Layout Blueprint:**
- **Top Marquee:** Continuous horizontal ticker containing asset values (`S&P 500 Index`, `DOW JONES US30`, `NIKKEI`, `BTC/USD`, etc.) with color-coded daily delta changes.
- **Sidebar Navigation:** Fixed left navigation dividing sections into "Stocks" (Market Pulse, Insider Strategy, Sector Scope, Swing Spectrum) and "Index" (Option Clock, Option Apex, Index Mover).
- **Main Dashboard Panel:** Responsive grid showcasing individual scanning tables.

---

## Core Features & Business Logic (Algorithms)

Implement the following scanner widgets using live components mapping real market feeds:

### 1. Breakout Beacon

Tracks stocks making explosive moves early in the session.

- **Columns:** `Signal (BULL/BEAR)`, `Symbol`, `% Change`, `Signal % (Delta at trigger time)`, `Time`
- **Logic:** Trigger `BULL` if a stock breaks out above its opening 15-minute high with volume $> 2\times$ its 20-period average volume.

### 2. Intraday Boost

Measures relative internal strength by comparing current session momentum against a historical baseline.

- **Columns:** `Symbol`, `% Change`, `R.Fac (Relative Strength Factor)`, `Signal`
- **Algorithm (Relative Strength Factor formula):**

$$R.Fac = \frac{\text{Current Intraday Volume}}{\text{Average 20-day Volume for same time interval}} \times \text{Volatility Coeff}$$

### 3. Price Level Trackers

- **Top Level Stocks:** Stocks where `Diff` is approaching $0.00$ relative to their 52-week or Day High boundaries.
- **Low Level Stocks:** Stocks hitting absolute rock-bottom multi-day support configurations.

### 4. Leaders Matrix

- **Top Gainers:** Highest intraday percentage gains sorted descending.
- **Top Losers:** Deepest intraday percentage drops sorted descending.
- **High Pow. Stocks:** Maximum institutional turnover volume calculated by:

$$\text{Turnover (T.O.)} = \text{Last Traded Price (LTP)} \times \text{Volume Traded}$$

---

## Mock/Real Integration Pipeline: `useMarketData.ts`

Ensure your data engine supports high-frequency runtime polling or direct socket connections. Implement this fallback blueprint within the data engine:

```typescript
import { useState, useEffect } from "react";

export interface MarketRow {
  symbol: string;
  changePercent: number;
  rFactor: number;
  turnover: number;
  time: string;
}

export const useMarketData = (refreshInterval = 5000) => {
  const [data, setData] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Integrate target financial market API here (e.g., Yahoo Finance, TwelveData)
        // const res = await fetch('YOUR_MARKET_API_ENDPOINT');
        // const raw = await res.json();

        // Compute metrics derived from algorithms.ts formulas here
        setLoading(false);
      } catch (error) {
        console.error("Market Feed Interrupted:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading };
};
```

---

## Prompt for CursorAI Generation

> "Using the configuration rules defined above, build the complete Next.js dashboard project workspace. Ensure Tailwind layers exactly mirror the `#12131a` palette, typography is flawlessly aligned within scannable data grids, and numbers display crisp up/down delta arrows ($\uparrow$ / $\downarrow$). Generate layout components first, followed by functional tables utilizing the custom market hook."

```

### Steps to implement using your AI editor:
1. Copy the code block above into a markdown file named `CLONE_SPEC.md` inside your codebase workspace.
2. Open your Cursor AI prompt container (Ctrl+I or Cmd+I) and point to this spec by writing: `Please implement the complete live market dashboard clone matching the guidelines defined in @CLONE_SPEC.md`.

```
