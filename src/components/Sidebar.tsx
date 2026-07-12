"use client";

import {
  Activity,
  BarChart3,
  Clock,
  Layers,
  LineChart,
  Radar,
  TrendingUp,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stocksNav = [
  { label: "Market Pulse", href: "/", active: true, icon: Activity },
  { label: "Insider Strategy", href: "#", active: false, icon: Radar },
  { label: "Sector Scope", href: "#", active: false, icon: Layers },
  { label: "Swing Spectrum", href: "#", active: false, icon: Waves },
] as const;

const indexNav = [
  { label: "Option Clock", href: "#", active: false, icon: Clock },
  { label: "Option Apex", href: "#", active: false, icon: BarChart3 },
  { label: "Index Mover", href: "#", active: false, icon: TrendingUp },
] as const;

function NavGroup({
  title,
  items,
}: {
  title: string;
  items: readonly {
    label: string;
    href: string;
    active: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <a
                href={item.active ? item.href : undefined}
                aria-disabled={!item.active}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-border/50 text-foreground"
                    : "cursor-not-allowed text-muted/70",
                )}
                title={item.active ? undefined : "Coming in a later phase"}
                onClick={(e) => {
                  if (!item.active) e.preventDefault();
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {!item.active && (
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-muted/60">
                    Soon
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-[#0e0f15] px-2 py-4">
      <div className="mb-8 flex items-center gap-2 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bull-bg">
          <LineChart className="h-4 w-4 text-bull-text" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">
            TradeFinder
          </p>
          <p className="text-[10px] text-muted">Market Pulse</p>
        </div>
      </div>
      <NavGroup title="Stocks" items={stocksNav} />
      <NavGroup title="Index" items={indexNav} />
      <div className="mt-auto px-3 pt-4 text-[10px] leading-relaxed text-muted">
        Phase 1 · Live NSE scan via Yahoo Finance. No simulated rows.
      </div>
    </aside>
  );
}
