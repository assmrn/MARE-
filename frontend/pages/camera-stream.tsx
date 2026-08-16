import { useState } from "react";
import { Video, VideoOff, Loader2, AlertTriangle, FlaskConical, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCameraFeeds, useLiveTelemetry, useMissionStatus } from "@/hooks/useMissionData";
import { useCameraStream } from "@/hooks/useCameraStream";
import { CameraBearingIndicator } from "@/components/camera/camera-bearing-indicator";
import type { CameraConnectionStatus, CameraFeed } from "@/types/mission";

const STATUS_LABEL: Record<CameraConnectionStatus, string> = {
  unavailable: "Not Connected",
  connecting: "Connecting…",
  live: "Live",
  error: "Signal Lost",
};

const STATUS_BADGE_VARIANT: Record<CameraConnectionStatus, "outline" | "primary" | "success" | "destructive"> = {
  unavailable: "outline",
  connecting: "primary",
  live: "success",
  error: "destructive",
};

function RgbFeedCard({ feed, headingDeg }: { feed: CameraFeed; headingDeg: number | null }) {
  const { status, lastFrameAt, fps, resolution, imgProps } = useCameraStream(feed.source);
  const [showDemoDetections, setShowDemoDetections] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-1.5">
            <Video className="size-3.5 text-primary" />
            {feed.label}
          </CardTitle>
          <CardDescription>{feed.type} sensor</CardDescription>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[status]} dot={status === "live"}>
          {STATUS_LABEL[status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
          {status === "live" && imgProps.src ? (
            <img src={imgProps.src} alt={`${feed.label} live feed`} className="h-full w-full object-cover" onLoad={imgProps.onLoad} onError={imgProps.onError} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
              {status === "connecting" ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : status === "error" ? (
                <AlertTriangle className="size-6 text-destructive" />
              ) : (
                <VideoOff className="size-6 text-muted-foreground" />
              )}
              <p className="max-w-[260px] px-4 text-xs text-slate-300">
                {status === "connecting" && "Connecting to camera source…"}
                {status === "error" && "Lost connection to the configured camera source."}
                {status === "unavailable" &&
                  "No RGB camera source configured. Set VITE_CAMERA_RGB_URL to connect a real MJPEG stream."}
              </p>
            </div>
          )}

          {/* Hidden loader img to detect connecting→live even before the visible one below mounts on first paint */}
          {status === "connecting" && imgProps.src && (
            <img src={imgProps.src} alt="" className="hidden" onLoad={imgProps.onLoad} onError={imgProps.onError} />
          )}

          {status === "live" && showDemoDetections && feed.detectionsAreSimulated && (
            <>
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded bg-warning px-2 py-1 text-[10px] font-semibold text-warning-foreground">
                <FlaskConical className="size-3" />
                SIMULATED DETECTIONS — DEMO DATA
              </div>
              {feed.detections.map((d) => (
                <div
                  key={d.id}
                  className="absolute rounded border-2 border-warning"
                  style={{ left: `${d.box[0]}%`, top: `${d.box[1]}%`, width: `${d.box[2]}%`, height: `${d.box[3]}%` }}
                >
                  <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-warning px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                    {d.label} {d.confidencePct}% (demo)
                  </span>
                </div>
              ))}
            </>
          )}

          {status === "live" && (
            <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
              <span className="mono">{lastFrameAt ? new Date(lastFrameAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span>
              <span>
                {fps ? `${fps.toFixed(1)} fps` : "fps —"} · {resolution ? `${resolution.width}×${resolution.height}` : "res —"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <CameraBearingIndicator headingDeg={headingDeg} mountYawOffsetDeg={feed.orientation.mountYawOffsetDeg} />
          <span className="text-[10.5px] text-muted-foreground">
            FOV {feed.orientation.fovHorizontalDeg}°×{feed.orientation.fovVerticalDeg}°
          </span>
        </div>

        {feed.detectionsAreSimulated && feed.detections.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1.5 text-[11px]"
            onClick={() => setShowDemoDetections((v) => !v)}
          >
            {showDemoDetections ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            {showDemoDetections ? "Hide" : "Show"} demo detection overlay (simulated — not a real AI pipeline)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function UnavailableSensorCard({ feed }: { feed: CameraFeed }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <VideoOff className="size-3.5" />
            {feed.type} Camera
          </CardTitle>
          <CardDescription>Future-ready panel — no source connected</CardDescription>
        </div>
        <Badge variant="outline">Not Available</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted text-center">
          <VideoOff className="size-6 text-muted-foreground" />
          <p className="max-w-[260px] px-4 text-xs text-muted-foreground">
            No {feed.type.toLowerCase()} sensor is connected to this project. This panel will activate automatically
            once a real {feed.type.toLowerCase()} source is wired in — see HANDOFF_STEP_04.md.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CameraStreamsPage() {
  const { data: feeds, isLoading } = useCameraFeeds();
  const { data: mission } = useMissionStatus();
  const { telemetry, connected, mode } = useLiveTelemetry();

  const headingDeg = telemetry ? telemetry.heading_deg : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Camera Streams</h1>
          <p className="text-xs text-muted-foreground">Onboard imaging payload · {mission?.missionName}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Vehicle:</span>
          {telemetry ? (
            <>
              <span className="mono">
                {telemetry.gps.latitude.toFixed(5)}, {telemetry.gps.longitude.toFixed(5)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{telemetry.gps.altitude.toFixed(0)}m AGL</span>
              <span className="text-muted-foreground">·</span>
              <span>hdg {telemetry.heading_deg.toFixed(0)}°</span>
              <Badge variant={mode === "live" ? "success" : "outline"} className="ml-1">
                {mode === "live" ? "LIVE" : "SIMULATION"}
              </Badge>
            </>
          ) : (
            <span className="text-muted-foreground">{connected ? "Loading…" : "Unavailable"}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading || !feeds
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)
          : feeds.map((feed) =>
              feed.type === "RGB" ? (
                <RgbFeedCard key={feed.id} feed={feed} headingDeg={headingDeg} />
              ) : (
                <UnavailableSensorCard key={feed.id} feed={feed} />
              )
            )}
      </div>
    </div>
  );
}
