import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from "recharts";
import { Wind, Droplets, Gauge, Thermometer, Eye, CloudRain, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeather } from "@/hooks/useMissionData";
import { cn } from "@/lib/utils";

function MetricTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const { data: weather, isLoading } = useWeather();

  if (isLoading || !weather) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const chartData = weather.forecast.map((f) => ({
    time: new Date(f.timeISO).toLocaleTimeString([], { hour: "2-digit" }),
    wind: Math.round(f.windSpeedKph),
    rain: f.rainProbabilityPct,
    temp: Math.round(f.tempC),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Weather Intelligence</h1>
          <p className="text-xs text-muted-foreground">Aviation-grade conditions for the mission area</p>
        </div>
        <Badge variant={weather.safeToFly ? "success" : "destructive"} className="gap-1.5 px-3 py-1 text-xs">
          {weather.safeToFly ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {weather.safeToFly ? "Safe to Fly" : "Flight Advisory"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <MetricTile icon={Wind} label="Wind Speed" value={`${weather.windSpeedKph} km/h`} />
        <MetricTile icon={Gauge} label="Wind Direction" value={`${weather.windDirectionDeg}°`} />
        <MetricTile icon={Droplets} label="Humidity" value={`${weather.humidityPct}%`} />
        <MetricTile icon={Gauge} label="Pressure" value={`${weather.pressureHpa} hPa`} />
        <MetricTile icon={Thermometer} label="Temperature" value={`${weather.temperatureC}°C`} />
        <MetricTile icon={Eye} label="Visibility" value={`${weather.visibilityKm} km`} />
        <MetricTile icon={CloudRain} label="Rain Probability" value={`${weather.rainProbabilityPct}%`} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>8-Hour Forecast</CardTitle>
            <CardDescription>Wind speed & rain probability</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar yAxisId="left" dataKey="rain" fill="#2563EB" fillOpacity={0.25} radius={[4, 4, 0, 0]} name="Rain %" />
              <Line yAxisId="right" type="monotone" dataKey="wind" stroke="#F59E0B" strokeWidth={2} dot={false} name="Wind km/h" />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {weather.forecast.map((f, i) => (
              <div key={i} className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-center", f.safeToFly ? "border-border" : "border-warning/50 bg-warning-muted")}>
                <span className="text-[10px] text-muted-foreground">{new Date(f.timeISO).toLocaleTimeString([], { hour: "2-digit" })}</span>
                <span className="text-xs font-semibold">{Math.round(f.tempC)}°</span>
                <span className={cn("size-1.5 rounded-full", f.safeToFly ? "bg-success" : "bg-warning")} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
