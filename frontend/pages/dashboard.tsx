import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { MissionMap } from "@/components/map/mission-map";
import { AiReasoningPanel } from "@/components/dashboard/ai-reasoning-panel";
import { MissionTimeline } from "@/components/dashboard/mission-timeline";
import { FlightControls } from "@/components/dashboard/flight-controls";
import { AlertsPanel } from "@/components/alerts/alerts-panel";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <KpiGrid />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MissionMap />
        </div>
        <div className="xl:col-span-1">
          <AiReasoningPanel />
        </div>
      </div>

      <MissionTimeline />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FlightControls />
        <AlertsPanel compact />
      </div>
    </div>
  );
}
