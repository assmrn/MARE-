// mare-dashboard/src/components/camera/camera-rgb-panel.tsx
import { useState } from "react";
import { Video, VideoOff, Eye, EyeOff } from "lucide-react";
import { CameraBearingIndicator } from "./camera-bearing-indicator";
import { CameraDetectionOverlay } from "./camera-detection-overlay";
 
interface CameraRgbPanelProps {
  headingDeg: number | null;
  mountYawOffsetDeg: number;
  fovHorizontalDeg: number;
  fovVerticalDeg: number;
}
 
export function CameraRgbPanel({
  headingDeg,
  mountYawOffsetDeg,
  fovHorizontalDeg,
  fovVerticalDeg,
}: CameraRgbPanelProps) {
  // If TS complains about this line, add VITE_CAMERA_RGB_URL to the
  // ImportMetaEnv interface in vite-env.d.ts.
  const streamUrl = import.meta.env.VITE_CAMERA_RGB_URL as string | undefined;
 
  const [streamFailed, setStreamFailed] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
 
  const connected = Boolean(streamUrl) && !streamFailed;
 
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Video className="size-4 text-primary" />
            RGB — Forward Camera
          </h3>
          <p className="text-xs text-muted-foreground">RGB sensor</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs ${
            connected
              ? "border-emerald-500/40 text-emerald-400"
              : "border-border text-muted-foreground"
          }`}
        >
          {connected ? "Connected" : "Not Connected"}
        </span>
      </div>
 
      <div className="relative mt-3 aspect-video overflow-hidden rounded-lg bg-black">
        {connected ? (
          <img
            src={streamUrl}
            alt="RGB forward camera feed"
            onError={() => setStreamFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <VideoOff className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {!streamUrl ? (
                <>
                  No RGB camera source configured. Set{" "}
                  <code>VITE_CAMERA_RGB_URL</code> to connect a real MJPEG
                  stream.
                </>
              ) : (
                "Stream unreachable — check the camera URL and network."
              )}
            </p>
          </div>
        )}
 
        {/* Bounding boxes only make sense once there's a frame to draw them over */}
        {connected && showDetections && <CameraDetectionOverlay />}
      </div>
 
      <div className="mt-2 flex items-center justify-between">
        <CameraBearingIndicator
          headingDeg={headingDeg}
          mountYawOffsetDeg={mountYawOffsetDeg}
        />
        <span className="text-[11px] text-muted-foreground">
          FOV {fovHorizontalDeg}°×{fovVerticalDeg}°
        </span>
      </div>
 
      <button
        onClick={() => setShowDetections((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
      >
        {showDetections ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
        {showDetections ? "Hide" : "Show"} demo detection overlay (simulated —
        not a real AI pipeline)
      </button>
    </div>
  );
}