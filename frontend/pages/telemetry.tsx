import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTelemetryHistory, useTelemetrySnapshot } from "@/hooks/useMissionData";

function MiniChart({ data, dataKey, color, unit }: { data: any[]; dataKey: string; color: string; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={((v: any) => [`${v}${unit}`, ""]) as any}
          labelFormatter={() => ""}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export default function TelemetryPage() {
  const { data: history, isLoading: loadingHistory } = useTelemetryHistory();
  const { data: t, isLoading: loadingSnap } = useTelemetrySnapshot();

  if (loadingHistory || loadingSnap || !history || !t) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Live Telemetry</h1>
        <p className="text-xs text-muted-foreground">Real-time subsystem data · updates every 2s</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Battery</CardTitle>
              <CardDescription>Power system</CardDescription>
            </div>
            <Badge variant={t.battery.percent > 30 ? "success" : "warning"}>{t.battery.percent.toFixed(0)}%</Badge>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="batteryPct" color="#10B981" unit="%" />
            <Separator className="my-2" />
            <DataRow label="Voltage" value={`${t.battery.voltage.toFixed(2)} V`} />
            <DataRow label="Current" value={`${t.battery.current.toFixed(1)} A`} />
            <DataRow label="Temperature" value={`${t.battery.temperatureC.toFixed(1)} °C`} />
            <DataRow label="Power Draw" value={`${t.battery.powerW.toFixed(0)} W`} />
            <DataRow label="Cells" value={`${t.battery.cellCount}S`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>GPS / Navigation</CardTitle>
              <CardDescription>GNSS receiver</CardDescription>
            </div>
            <Badge variant="success">3D Fix</Badge>
          </CardHeader>
          <CardContent>
            <DataRow label="Latitude" value={t.gps.lat.toFixed(5)} />
            <DataRow label="Longitude" value={t.gps.lng.toFixed(5)} />
            <DataRow label="Altitude" value={`${t.gps.altitudeM.toFixed(1)} m`} />
            <DataRow label="Satellites" value={String(t.gps.satellites)} />
            <DataRow label="HDOP" value={t.gps.hdop.toFixed(2)} />
            <DataRow label="Heading" value={`${t.gps.headingDeg}°`} />
            <Separator className="my-2" />
            <MiniChart data={history} dataKey="altitudeM" color="#2563EB" unit="m" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Communication</CardTitle>
              <CardDescription>{t.comms.linkType} link</CardDescription>
            </div>
            <Badge variant={t.comms.signalPct > 80 ? "success" : "warning"}>{t.comms.signalPct}%</Badge>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="signalPct" color="#2563EB" unit="%" />
            <Separator className="my-2" />
            <DataRow label="Latency" value={`${t.comms.latencyMs} ms`} />
            <DataRow label="Packet Loss" value={`${t.comms.packetLossPct.toFixed(2)}%`} />
            <DataRow label="Link Type" value={t.comms.linkType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Motors & ESCs</CardTitle>
              <CardDescription>4x brushless quad configuration</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {t.motors.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{m.label}</span>
                  <Badge variant={m.escStatus === "nominal" ? "success" : "warning"} className="capitalize">
                    {m.escStatus}
                  </Badge>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>{m.rpm.toLocaleString()} RPM</span>
                  <span>{m.currentA.toFixed(1)} A</span>
                  <span>{m.temperatureC.toFixed(1)} °C</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ground Speed</CardTitle>
              <CardDescription>Velocity over ground</CardDescription>
            </div>
            <Badge variant="primary">{t.groundSpeedMs.toFixed(1)} m/s</Badge>
          </CardHeader>
          <CardContent>
            <MiniChart data={history} dataKey="groundSpeedMs" color="#F59E0B" unit=" m/s" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mission Progress</CardTitle>
              <CardDescription>Navigation state</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DataRow label="Current Waypoint" value={`${t.mission.currentWaypointIndex} / ${t.mission.totalWaypoints}`} />
            <DataRow label="Distance Remaining" value={`${(t.mission.distanceRemainingM / 1000).toFixed(2)} km`} />
            <DataRow label="ETA" value={`${Math.round(t.mission.etaSeconds / 60)} min`} />
            <DataRow label="Wind Compensation" value={`${t.mission.windCompensationDeg.toFixed(1)}°`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
