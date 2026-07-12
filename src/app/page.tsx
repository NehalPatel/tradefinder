import { GlobalTicker } from "@/components/GlobalTicker";
import { ScannerGrid } from "@/components/ScannerGrid";
import { Sidebar } from "@/components/Sidebar";

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalTicker />
        <ScannerGrid />
      </div>
    </div>
  );
}
