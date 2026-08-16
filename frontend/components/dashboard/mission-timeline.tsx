import { Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDuration } from "@/lib/utils";
import { useMissionStatus, useWaypoints } from "@/hooks/useMissionData";

export function MissionTimeline() {
  const { data: waypoints, isLoading } = useWaypoints();
  const { data: mission } = useMissionStatus();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Mission Timeline</CardTitle>
          <CardDescription>
            {mission ? `Elapsed ${formatDuration(mission.elapsedSeconds)} · ETA ${formatDuration(mission.etaSeconds)}` : "Loading…"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !waypoints ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="relative flex items-start justify-between overflow-x-auto pb-1 pt-1">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: `${(waypoints.filter((w) => w.status === "completed").length / (waypoints.length - 1)) * 100}%`,
              }}
            />
            {waypoints.map((wp) => (
              <div key={wp.id} className="group relative z-10 flex min-w-[86px] flex-col items-center gap-1.5 px-1">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 bg-surface transition-colors",
                    wp.status === "completed" && "border-success bg-success text-success-foreground",
                    wp.status === "active" && "border-primary text-primary animate-pulse-dot",
                    wp.status === "pending" && "border-border text-muted-foreground"
                  )}
                >
                  {wp.status === "completed" ? <Check className="size-4" /> : <Circle className="size-2.5 fill-current" />}
                </span>
                <span className="text-center text-[10.5px] font-medium leading-tight text-foreground">{wp.label}</span>
                <span className="text-[10px] text-muted-foreground">{wp.altitudeM}m</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
