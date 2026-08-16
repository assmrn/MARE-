import type { CameraOrientation, CameraSourceConfig, CameraTransport } from "@/types/mission";

const env = import.meta.env;

function readTransport(value: string | undefined): CameraTransport {
  if (value === "mjpeg" || value === "hls" || value === "webrtc") return value;
  return "none";
}

/**
 * RGB is the only feed with a real-if-configured path. Set VITE_CAMERA_RGB_URL
 * (and optionally VITE_CAMERA_RGB_TRANSPORT, default "mjpeg") once a real
 * video bridge exists — nothing else in the app needs to change.
 *
 * MJPEG is the only transport genuinely playable today with zero added
 * dependencies (a plain <img> tag). HLS needs hls.js (not installed —
 * per the "don't add dependencies speculatively" constraint, only add it
 * once HLS is the confirmed real transport). WebRTC needs a signaling
 * client matching whatever the backend's bridge speaks. Both are modeled
 * in the type system so the UI can show an honest "transport not yet
 * wired client-side" state instead of silently failing.
 */
export const rgbCameraSource: CameraSourceConfig = {
  transport: readTransport(env.VITE_CAMERA_RGB_TRANSPORT),
  url: env.VITE_CAMERA_RGB_URL ?? null,
};

// Thermal/depth have no plausible generic env-driven source — there's no
// standard "thermal stream URL" the way MJPEG/RTSP is a standard RGB
// pattern, and inventing one would misrepresent capability that doesn't
// exist anywhere in this project yet. These stay hard-coded unavailable
// until a real source is chosen; see HANDOFF_STEP_04.md "known limitations".
export const thermalCameraSource: CameraSourceConfig = { transport: "none", url: null };
export const depthCameraSource: CameraSourceConfig = { transport: "none", url: null };

export const DEFAULT_FORWARD_ORIENTATION: CameraOrientation = {
  mountYawOffsetDeg: 90, // Changed from 0 to 90 for visual testing
  mountPitchDeg: 0,
  fovHorizontalDeg: 90,
  fovVerticalDeg: 60,
};

// ---------------------------------------------------------------------------
// FOV cone visualization radius (Mission Map overlay, Step 5)
//
// There is no real range/depth data anywhere in this project — no rangefinder,
// no stereo depth, nothing that measures how far the camera can usefully see.
// A level or forward-tilted camera's true "view distance" extends toward the
// horizon, which isn't a meaningful shape to draw on a mission-scale map. So
// this radius is an explicit, configurable VISUALIZATION choice (scaled by
// altitude so higher altitude reads as "sees further," which is at least
// directionally sensible) — not a claim about actual sensor range. Treat it
// as a UI affordance for "which way is the camera pointed," not a coverage
// measurement.
// ---------------------------------------------------------------------------
export const FOV_CONE_MIN_RADIUS_M = 40;
export const FOV_CONE_MAX_RADIUS_M = 300;
export const FOV_CONE_ALTITUDE_SCALE = 3; // radius ≈ altitude × this, clamped to [min, max]

export function computeFovConeRadiusM(altitudeM: number): number {
  return Math.min(FOV_CONE_MAX_RADIUS_M, Math.max(FOV_CONE_MIN_RADIUS_M, altitudeM * FOV_CONE_ALTITUDE_SCALE));
}
