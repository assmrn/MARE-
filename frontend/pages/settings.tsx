import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [notifications, setNotifications] = useState(true);
  const [telemetryPolling, setTelemetryPolling] = useState(true);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">Console preferences and operator profile</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how MARE looks on this device</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "system" as const, label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                  theme === value ? "border-primary bg-primary-muted text-primary" : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mission Console</CardTitle>
            <CardDescription>Units, polling, and notification behavior</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SettingRow label="Units" description="Distance, speed, and altitude display units">
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs">
              <button
                onClick={() => setUnits("metric")}
                className={cn("rounded px-2.5 py-1 font-medium", units === "metric" ? "bg-surface shadow-soft" : "text-muted-foreground")}
              >
                Metric
              </button>
              <button
                onClick={() => setUnits("imperial")}
                className={cn("rounded px-2.5 py-1 font-medium", units === "imperial" ? "bg-surface shadow-soft" : "text-muted-foreground")}
              >
                Imperial
              </button>
            </div>
          </SettingRow>
          <SettingRow label="Push Notifications" description="Critical alerts and anomaly detections">
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </SettingRow>
          <SettingRow label="Live Telemetry Polling" description="Auto-refresh telemetry every 2 seconds">
            <Switch checked={telemetryPolling} onCheckedChange={setTelemetryPolling} />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Operator Profile</CardTitle>
            <CardDescription>Pilot-in-command details for this session</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input defaultValue="R. Okafor" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Certification ID</label>
              <Input defaultValue="FAA-107-88214" />
            </div>
          </div>
          <Button size="sm">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
