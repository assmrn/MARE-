import { useState } from "react";
import { toast } from "sonner";
import { Trash2, UploadCloud, XCircle, MapPin, Flag, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MissionMap } from "@/components/map/mission-map";
import { MissionStatusBar } from "@/components/mission/mission-status-bar";
import { useMissionStore } from "@/store/missionStore";
import { cn } from "@/lib/utils";
import type { PlanningMode } from "@/types/mission";

const MODE_BUTTONS: { mode: PlanningMode; label: string; icon: typeof MapPin }[] = [
  { mode: "origin", label: "Set Origin", icon: CircleDot },
  { mode: "waypoint", label: "Add Waypoint", icon: MapPin },
  { mode: "destination", label: "Set Destination", icon: Flag },
];

export default function MissionPlannerPage() {
  const points = useMissionStore((s) => s.points);
  const status = useMissionStore((s) => s.status);
  const planningMode = useMissionStore((s) => s.planningMode);
  const setPlanningMode = useMissionStore((s) => s.setPlanningMode);
  const removePoint = useMissionStore((s) => s.removePoint);
  const clearMission = useMissionStore((s) => s.clearMission);
  const uploadAndStart = useMissionStore((s) => s.uploadAndStart);
  const [uploading, setUploading] = useState(false);

  const origin = points.find((p) => p.kind === "origin");
  const destination = points.find((p) => p.kind === "destination");
  const canUpload = Boolean(origin && destination) && status !== "UPLOADING";

  const handleUpload = async () => {
    setUploading(true);
    await uploadAndStart();
    setUploading(false);
    const latest = useMissionStore.getState();
    if (latest.status === "FAILED") {
      toast.error("Mission upload didn't complete", { description: latest.uploadError ?? undefined });
    } else {
      toast.success("Mission uploaded and started");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mission Planner</h1>
          <p className="text-xs text-muted-foreground">Design a mission, then upload it to PX4 via the MARE backend</p>
        </div>
        <div className="flex items-center gap-1.5">
          {MODE_BUTTONS.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              size="sm"
              variant={planningMode === mode ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setPlanningMode(planningMode === mode ? "none" : mode)}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <MissionStatusBar />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MissionMap />
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mission Plan</CardTitle>
              <CardDescription>
                {points.length === 0
                  ? "Click a mode above, then click the map to place points"
                  : `${points.length} point${points.length === 1 ? "" : "s"} planned`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {points.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No mission points yet. A mission needs at least an origin and a destination before it can be uploaded.
              </div>
            )}

            {origin && (
              <PlanPointRow
                label="Origin"
                point={origin}
                badgeVariant="success"
                onRemove={() => removePoint(origin.id)}
              />
            )}
            {points
              .filter((p) => p.kind === "waypoint")
              .map((wp, i) => (
                <PlanPointRow
                  key={wp.id}
                  label={`Waypoint ${i + 1}`}
                  point={wp}
                  badgeVariant="primary"
                  onRemove={() => removePoint(wp.id)}
                />
              ))}
            {destination && (
              <PlanPointRow
                label="Destination"
                point={destination}
                badgeVariant="destructive"
                onRemove={() => removePoint(destination.id)}
              />
            )}

            {points.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={clearMission}>
                  <XCircle className="size-3.5" />
                  Clear
                </Button>
                <Button size="sm" className="flex-1 gap-1.5" disabled={!canUpload || uploading} onClick={handleUpload}>
                  <UploadCloud className="size-3.5" />
                  {uploading || status === "UPLOADING" ? "Uploading…" : "Upload & Start"}
                </Button>
              </div>
            )}
            {!origin || !destination ? (
              points.length > 0 && (
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  A mission needs both an origin and a destination to upload.
                </p>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlanPointRow({
  label,
  point,
  badgeVariant,
  onRemove,
}: {
  label: string;
  point: { lat: number; lng: number; alt: number; speed: number };
  badgeVariant: "success" | "primary" | "destructive";
  onRemove: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors border-border")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-medium">{label}</p>
          <Badge variant={badgeVariant} className="shrink-0">
            {point.alt}m &middot; {point.speed}m/s
          </Badge>
        </div>
        <p className="mt-0.5 text-[10.5px] text-muted-foreground">
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${label}`} onClick={onRemove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
