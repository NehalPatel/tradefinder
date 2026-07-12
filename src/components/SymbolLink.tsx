import { cn } from "@/lib/utils";

/** Opens TradingView chart for an NSE equity on the 5-minute timeframe. */
export function tradingViewUrl(nseSymbol: string): string {
  const params = new URLSearchParams({
    symbol: `NSE:${nseSymbol}`,
    interval: "5",
  });
  return `https://www.tradingview.com/chart/?${params.toString()}`;
}

export function SymbolLink({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <a
      href={tradingViewUrl(symbol)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${symbol} 5m chart on TradingView`}
      className={cn(
        "font-medium text-foreground underline-offset-2 hover:text-bull-text hover:underline",
        className,
      )}
    >
      {symbol}
    </a>
  );
}
