// ---------------------------------------------------------------------------
// Geodesic helpers for the camera-direction / FOV-cone map overlay.
//
// YAW CONVENTION (read this before touching anything below):
// - Vehicle heading (`headingDeg`) is a standard compass bearing: 0° = North,
//   increasing CLOCKWISE, so 90° = East, 180° = South, 270° = West. This
//   matches what PX4/MAVSDK reports via telemetry.heading_deg.
// - Camera mount yaw offset (`mountYawOffsetDeg`) is measured relative to the
//   vehicle's forward direction, ALSO CLOCKWISE-positive (positive = camera
//   turned right/starboard of nose, negative = left/port).
// - Camera absolute bearing = (headingDeg + mountYawOffsetDeg) mod 360.
//   Worked examples (from the Step 5 spec, both verified below):
//     heading 90° (East) + mount yaw   0°  → camera bearing  90° (East)
//     heading 90° (East) + mount yaw -90°  → camera bearing   0° (North)
// This is a plain clockwise rotation composition — no trig subtlety, but
// it's the single place a sign error would silently point the FOV cone the
// wrong way, so it's centralized here and unit-tested (see geo.test.ts).
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalizes any bearing to the [0, 360) range. */
export function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Camera's absolute compass bearing — see the yaw convention doc above. */
export function computeCameraBearing(vehicleHeadingDeg: number, mountYawOffsetDeg: number): number {
  return normalizeBearing(vehicleHeadingDeg + mountYawOffsetDeg);
}

/**
 * Standard spherical "destination point given distance and bearing" formula
 * (the same formula behind most geodesy libraries' `destinationPoint`) —
 * NOT a flat-earth degrees-per-meter approximation, which would be
 * measurably wrong for east-west distances away from the equator.
 */
export function destinationPoint(lat: number, lng: number, bearingDeg: number, distanceM: number): [number, number] {
  const δ = distanceM / EARTH_RADIUS_M; // angular distance
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);

  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

  return [toDeg(φ2), toDeg(λ2)];
}

/**
 * Builds a pie-slice polygon representing the camera's horizontal FOV,
 * centered on `centerBearingDeg`, as [lat, lng] points suitable for a
 * Leaflet Polygon: [origin, ...arc points from left edge to right edge, origin].
 *
 * `radiusM` is an illustrative visualization distance, not a measured sensor
 * range — see camera-fov-config.ts for why, and HANDOFF_STEP_05.md "FOV
 * calculation" for the documented default.
 */
export function buildFovConePolygon(
  originLat: number,
  originLng: number,
  centerBearingDeg: number,
  horizontalFovDeg: number,
  radiusM: number,
  arcSteps = 10
): [number, number][] {
  const halfFov = horizontalFovDeg / 2;
  const startBearing = centerBearingDeg - halfFov;
  const points: [number, number][] = [[originLat, originLng]];

  for (let i = 0; i <= arcSteps; i++) {
    const bearing = startBearing + (horizontalFovDeg * i) / arcSteps;
    points.push(destinationPoint(originLat, originLng, normalizeBearing(bearing), radiusM));
  }

  points.push([originLat, originLng]);
  return points;
}
