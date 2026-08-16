import type { LucideIcon } from "lucide-react";
import {
  BatteryMedium,
  ArrowUpFromLine,
  Gauge,
  Satellite,
  Navigation2,
  SignalHigh,
  Flag,
  CloudLightning,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMissionStatus, useTelemetrySnapshot } from "@/hooks/useMissionData";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  supporting: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

function KpiCard({ icon: Icon, label, value, unit, supporting, trend, trendLabel, tone = "default" }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-primary";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <span className={cn("flex size-8 items-center justify-center rounded-md bg-muted", toneClass)}>
            <Icon className="size-4" />
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-muted-foreground"
              )}
            >
              <TrendIcon className="size-3" />
              {trendLabel}
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{supporting}</p>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function KpiGrid() {
  const { data: telemetry, isLoading: loadingTelemetry } = useTelemetrySnapshot();
  const { data: mission, isLoading: loadingMission } = useMissionStatus();

  if (loadingTelemetry || loadingMission || !telemetry || !mission) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  const batteryTone = telemetry.battery.percent > 40 ? "success" : telemetry.battery.percent > 20 ? "warning" : "destructive";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        icon={BatteryMedium}
        label="Battery"
        value={telemetry.battery.percent.toFixed(0)}
        unit="%"
        supporting={`${telemetry.battery.voltage.toFixed(1)}V · ${(telemetry.battery.timeRemainingSeconds / 60).toFixed(0)} min left`}
        trend="down"
        trendLabel="0.4%/min"
        tone={batteryTone}
      />
      <KpiCard
        icon={ArrowUpFromLine}
        label="Altitude"
        value={telemetry.altitudeM.toFixed(0)}
        unit="m"
        supporting="AGL · target 135m"
        trend="flat"
        trendLabel="stable"
      />
      <KpiCard
        icon={Gauge}
        label="Ground Speed"
        value={telemetry.groundSpeedMs.toFixed(1)}
        unit="m/s"
        supporting={`Heading ${telemetry.gps.headingDeg}°`}
        trend="up"
        trendLabel="+0.3"
      />
      <KpiCard
        icon={Satellite}
        label="GPS"
        value={String(telemetry.gps.satellites)}
        unit="sats"
        supporting={`HDOP ${telemetry.gps.hdop.toFixed(2)} · 3D Fix`}
        tone="success"
      />
      <KpiCard
        icon={Navigation2}
        label="Flight Mode"
        value={mission.flightMode}
        supporting={mission.armed ? "Armed · Autonomous" : "Disarmed"}
        tone="default"
      />
      <KpiCard
        icon={SignalHigh}
        label="Signal Strength"
        value={telemetry.signalPct.toFixed(0)}
        unit="%"
        supporting={`${telemetry.comms.latencyMs}ms latency · RF link`}
        trend={telemetry.signalPct > 80 ? "flat" : "down"}
        trendLabel={telemetry.signalPct > 80 ? "stable" : "watch"}
      />
      <KpiCard
        icon={Flag}
        label="Mission Progress"
        value={mission.missionProgressPct.toFixed(0)}
        unit="%"
        supporting={`WP ${telemetry.mission.currentWaypointIndex}/${telemetry.mission.totalWaypoints} · ETA ${(telemetry.mission.etaSeconds / 60).toFixed(0)}m`}
      />
      <KpiCard
        icon={CloudLightning}
        label="Weather Risk"
        value={telemetry.weatherRiskPct.toFixed(0)}
        unit="%"
        supporting="Low risk · winds within limits"
        tone="success"
      />
      <div className="col-span-2 hidden sm:col-span-3 xl:col-span-4 xl:block">
        <Progress value={mission.missionProgressPct} className="mt-1" />
      </div>
    </div>
  );
}
