import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, AlertTriangle, BatteryMedium, CloudSun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as api from "@/services/api";
import type { ChatMessage } from "@/types/mission";
import { useAnomalies, useTelemetrySnapshot, useWeather } from "@/hooks/useMissionData";

const SUGGESTIONS = [
  "Explain the active anomaly",
  "How's the battery holding up?",
  "Is the weather safe to fly?",
  "Suggest a route optimization",
  "What happened 20 minutes ago?",
];

const INITIAL: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "MARE Copilot online. I have live access to telemetry, the AI reasoning log, and weather data for this mission — ask me anything.",
  timestampISO: new Date().toISOString(),
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: telemetry } = useTelemetrySnapshot();
  const { data: anomalies } = useAnomalies();
  const { data: weather } = useWeather();
  const activeAnomaly = anomalies?.find((a) => a.status !== "resolved");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text, timestampISO: new Date().toISOString() }]);
    setInput("");
    setThinking(true);
    const reply = await api.sendCopilotMessage(text);
    setMessages((prev) => [...prev, reply]);
    setThinking(false);
  };

  return (
    <div className="grid h-[calc(100vh-6.5rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="flex flex-col overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              AI Copilot
            </CardTitle>
            <CardDescription>Context-aware mission assistant</CardDescription>
          </div>
          <Badge variant="success" dot>Connected</Badge>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing telemetry & reasoning log…
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about telemetry, anomalies, weather, or routing…"
            aria-label="Message MARE Copilot"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || thinking}>
            <Send className="size-4" />
          </Button>
        </form>
      </Card>

      <div className="space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Mission Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
              <BatteryMedium className="size-4 text-success shrink-0" />
              <div className="text-xs">
                <p className="font-medium">Battery {telemetry?.battery.percent.toFixed(0) ?? "—"}%</p>
                <p className="text-muted-foreground">{telemetry ? `${(telemetry.battery.timeRemainingSeconds / 60).toFixed(0)} min remaining` : "Loading…"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
              <AlertTriangle className={cn("size-4 shrink-0", activeAnomaly ? "text-warning" : "text-success")} />
              <div className="text-xs">
                <p className="font-medium">{activeAnomaly ? "1 Active Anomaly" : "No Active Anomalies"}</p>
                <p className="text-muted-foreground">{activeAnomaly?.affectedSubsystem ?? "All subsystems nominal"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
              <CloudSun className="size-4 text-primary shrink-0" />
              <div className="text-xs">
                <p className="font-medium">{weather?.safeToFly ? "Safe to Fly" : "Weather Advisory"}</p>
                <p className="text-muted-foreground">{weather ? `Wind ${weather.windSpeedKph} km/h · ${weather.temperatureC}°C` : "Loading…"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copilot Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Mission &amp; telemetry Q&amp;A</li>
              <li>Failure diagnosis walkthroughs</li>
              <li>Route &amp; waypoint suggestions</li>
              <li>Weather impact explanations</li>
              <li>Emergency procedure guidance</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
