import { Polygon, Polyline, Tooltip } from "react-leaflet";
import { computeCameraBearing, destinationPoint, buildFovConePolygon } from "@/lib/geo";
import { computeFovConeRadiusM } from "@/lib/camera-providers";
import type { CameraOrientation } from "@/types/mission";

interface CameraFovOverlayProps {
  lat: number;
  lng: number;
  altitudeM: number;
  vehicleHeadingDeg: number;
  orientation: CameraOrientation;
  showCone: boolean;
  stale: boolean;
}

/**
 * Renders two things, both derived from the SAME telemetry tick passed in
 * via props (see mission-map.tsx — this component never subscribes to
 * telemetry itself, specifically to avoid the two-independent-poll-cycles
 * jitter described in HANDOFF_STEP_05.md "synchronization strategy"):
 *  - a thin center-line ray showing the camera's absolute look direction
 *  - an optional filled FOV cone (toggleable, see the "Camera FOV" control)
 */
export function CameraFovOverlay({ lat, lng, altitudeM, vehicleHeadingDeg, orientation, showCone, stale }: CameraFovOverlayProps) {
  const cameraBearing = computeCameraBearing(vehicleHeadingDeg, orientation.mountYawOffsetDeg);
  const radiusM = computeFovConeRadiusM(altitudeM);
  const color = stale ? "#94A3B8" : "#F59E0B";

  const rayEnd = destinationPoint(lat, lng, cameraBearing, radiusM);
  const conePolygon = showCone ? buildFovConePolygon(lat, lng, cameraBearing, orientation.fovHorizontalDeg, radiusM) : null;

  return (
    <>
      {conePolygon && (
        <Polygon positions={conePolygon} pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: stale ? 0.06 : 0.14, opacity: 0.5 }}>
          <Tooltip sticky>
            <div className="text-xs">
              <p className="font-medium">Camera FOV (illustrative)</p>
              <p className="text-muted-foreground">
                Looking {cameraBearing.toFixed(0)}° &middot; {orientation.fovHorizontalDeg}° horizontal &middot; ~{radiusM.toFixed(0)}m shown
              </p>
            </div>
          </Tooltip>
        </Polygon>
      )}
      <Polyline positions={[[lat, lng], rayEnd]} pathOptions={{ color, weight: 2, opacity: stale ? 0.4 : 0.85, dashArray: "2 4" }} />
    </>
  );
}
