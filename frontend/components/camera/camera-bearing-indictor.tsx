import { Navigation } from "lucide-react";

const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function toCompassPoint(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}

/**
 * Absolute bearing the camera is pointed, derived from real drone heading +
 * the camera's fixed mount offset — not the video frame's rotation. This is
 * always shown as an abstract arrow + text, never used to rotate an actual
 * video element (see HANDOFF_STEP_04.md "drone orientation relationship").
 */
export function CameraBearingIndicator({ headingDeg, mountYawOffsetDeg }: { headingDeg: number | null; mountYawOffsetDeg: number }) {
  if (headingDeg === null) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Navigation className="size-3.5 opacity-40" />
        Heading unknown
      </div>
    );
  }

  const bearing = ((headingDeg + mountYawOffsetDeg) % 360 + 360) % 360;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Navigation className="size-3.5 text-primary transition-transform" style={{ transform: `rotate(${bearing}deg)` }} />
      Looking {bearing.toFixed(0)}° ({toCompassPoint(bearing)})
    </div>
  );
}

