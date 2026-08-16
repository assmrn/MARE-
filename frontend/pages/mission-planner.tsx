import { useState, useEffect } from "react";
import { Radio, Satellite, FlaskConical, Clock, AlertTriangle, MapPinOff, Bot } from "lucide-react";
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

export function MissionStatusBar() {
  // 1. Extract 'telemetry' from the hook to access GPS data
  const { telemetry, connected, mode, backendError, isStale, lastUpdatedAt } = useLiveTelemetry();
  const status = useMissionStore((s) => s.status);
  const uploadError = useMissionStore((s) => s.uploadError);
  const statusStyle = STATUS_STYLES[status];

  // 2. State for Simulated AI detection
  const [isSimulatedAI, setIsSimulatedAI] = useState(false);

  // 3. Listen to the Detections WS to see if the backend is sending mock data
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/api/ws/detections");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Backend mock detections are prefixed with 'sim_'
        setIsSimulatedAI(data.some((d: any) => d.detection_id?.startsWith("sim_")));
      } catch (e) {
        // Ignore parse errors silently
      }
    };
    return () => ws.close();
  }, []);

  const secondsSinceUpdate = lastUpdatedAt ? Math.round((Date.now() - lastUpdatedAt) / 1000) : null;
  
  // 4. Check if GPS is unavailable (satellites drop to 0)
  const isGpsUnavailable = telemetry?.gps?.satellites === 0;

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

      {/* --- STEP 7 NEW BADGES BELOW --- */}

      {isStale && !backendError && (
        <Badge variant="warning" className="gap-1">
          <Clock className="size-3" />
          Stale{secondsSinceUpdate !== null ? ` · ${secondsSinceUpdate}s` : ""}
        </Badge>
      )}

      {isGpsUnavailable && connected && (
        <Badge variant="warning" className="gap-1 bg-amber-500 text-black hover:bg-amber-600">
          <MapPinOff className="size-3" />
          GPS Unavailable
        </Badge>
      )}

      {isSimulatedAI && (
        <Badge className="gap-1 bg-purple-500 text-white hover:bg-purple-600">
          <Bot className="size-3" />
          Simulated AI Active
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
