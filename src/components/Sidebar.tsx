"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Clock,
  Layers,
  LayoutDashboard,
  LineChart,
  Radar,
  TrendingUp,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stocksNav = [
  { label: "Trade Desk", href: "/trade-desk", icon: LayoutDashboard, phase: 3 },
  { label: "Market Pulse", href: "/market-pulse", icon: Activity, phase: 1 },
  { label: "Insider Strategy", href: "/insider-strategy", icon: Radar, phase: 2 },
  { label: "Sector Scope", href: "/sector-scope", icon: Layers, phase: 2 },
  { label: "Swing Spectrum", href: "/swing-spectrum", icon: Waves, phase: 2 },
] as const;

const indexNav = [
  { label: "Option Clock", href: "/option-clock", icon: Clock, phase: 3 },
  { label: "Option Apex", href: "/option-apex", icon: BarChart3, phase: 3 },
  { label: "Index Mover", href: "/index-mover", icon: TrendingUp, phase: 3 },
] as const;

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: readonly {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    phase: number;
  }[];
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const enabled = item.href !== "#";
          const active =
            enabled &&
            (pathname === item.href ||
              (item.href === "/trade-desk" && pathname === "/"));
          const className = cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            active
              ? "bg-border/50 text-foreground"
              : enabled
                ? "text-muted hover:bg-border/30 hover:text-foreground"
                : "cursor-not-allowed text-muted/70",
          );

          if (!enabled) {
            return (
              <li key={item.label}>
                <span className={className} title="Coming in a later phase">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-muted/60">
                    Soon
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.label}>
              <Link href={item.href} className={className}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

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
          <p className="text-[10px] text-muted">Live NSE scanners</p>
        </div>
      </div>
      <NavGroup title="Stocks" items={stocksNav} pathname={pathname} />
      <NavGroup title="Index" items={indexNav} pathname={pathname} />
      <div className="mt-auto px-3 pt-4 text-[10px] leading-relaxed text-muted">
        Trade Desk + Phase 3 index tools live. Always verify on chart.
      </div>
    </aside>
  );
}
