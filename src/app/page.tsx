import { DashboardShell } from "@/components/DashboardShell";
import { ScannerGrid } from "@/components/ScannerGrid";

export default function HomePage() {
  return (
    <DashboardShell>
      <ScannerGrid />
    </DashboardShell>
  );
}
