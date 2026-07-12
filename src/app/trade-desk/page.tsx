import { DashboardShell } from "@/components/DashboardShell";
import { TradeDeskView } from "@/components/trade-desk/TradeDeskView";

export default function TradeDeskPage() {
  return (
    <DashboardShell>
      <TradeDeskView />
    </DashboardShell>
  );
}
