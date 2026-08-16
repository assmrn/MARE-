import { Radio, Satellite, FlaskConical, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLiveTelemetry } from "@/hooks/useMissionData";
import { useMissionStore } from "@/store/missionStore";
import { cn } from "@/lib/utils";
import type { MissionSyncStatus } from "@/types/mission";

const STATUS_STYLES: Record<MissionSyncStatus, { variant: "default" | "primary" | "success" | "warning" | "destructive" | "outline"; label: string }> = {
  PLANNED: { variant: "outline", label: "Mission Planned" },
  UPLOADING: { variant: "primary", label: "Uploading…" },
  UPLOADED: { variant: "primary", label: "Mission Uploaded" },
  EXECUTING: { variant: "success", label: "Vehicle Executing" },
  PAUSED: { variant: "warning", label: "Mission Paused" },
  COMPLETED: { variant: "success", label: "Mission Completed" },
  FAILED: { variant: "destructive", label: "Mission Failed" },
  CANCELLED: { variant: "outline", label: "Mission Cancelled" },
};

/**
 * Deliberately renders PX4 connection, telemetry mode, and mission sync
 * status as three separate badges rather than one combined pill — these are
 * genuinely independent facts (you can be PX4-connected with no mission
 * uploaded, or have a mission UPLOADED while PX4 briefly drops) and
 * collapsing them into one indicator would misrepresent the real state.
 */
export function MissionStatusBar() {
  const { connected, mode, backendError, isStale, lastUpdatedAt } = useLiveTelemetry();
  const status = useMissionStore((s) => s.status);
  const uploadError = useMissionStore((s) => s.uploadError);
  const statusStyle = STATUS_STYLES[status];

  const secondsSinceUpdate = lastUpdatedAt ? Math.round((Date.now() - lastUpdatedAt) / 1000) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <Badge variant={backendError ? "destructive" : connected ? "success" : "destructive"} dot className="gap-1">
        <Radio className="size-3" />
        {backendError ? "Backend Unreachable" : connected ? "PX4 Connected" : "PX4 Offline"}
      </Badge>

      <Badge variant={mode === "live" ? "success" : mode === "simulation" ? "outline" : "outline"} className="gap-1">
        {mode === "live" ? <Satellite className="size-3" /> : <FlaskConical className="size-3" />}
        {mode === "live" ? "Live Telemetry" : mode === "simulation" ? "Simulation Mode" : "Mode Unknown"}
      </Badge>

      <Badge variant={statusStyle.variant} dot>
        {statusStyle.label}
      </Badge>

      {isStale && !backendError && (
        <Badge variant="warning" className="gap-1">
          <Clock className="size-3" />
          Stale{secondsSinceUpdate !== null ? ` · ${secondsSinceUpdate}s` : ""}
        </Badge>
      )}

      {uploadError && (
        <span className={cn("flex items-center gap-1 text-[11px] text-destructive")}>
          <AlertTriangle className="size-3 shrink-0" />
          {uploadError}
        </span>
      )}
    </div>
  );
}
