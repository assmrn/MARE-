import type {
  AirQualityZone,
  AlertItem,
  AnomalyEvent,
  ArchivedMission,
  BatteryTelemetry,
  CameraFeed,
  Certification,
  CommsTelemetry,
  GeofenceZone,
  GpsTelemetry,
  LogEntry,
  MissionProgress,
  MissionStatus,
  MotorTelemetry,
  OperatorProfile,
  TelemetryHistoryPoint,
  TelemetrySnapshot,
  Waypoint,
  WeatherSnapshot,
  WildfireZone,
} from "@/types/mission";
import { rgbCameraSource, thermalCameraSource, depthCameraSource, DEFAULT_FORWARD_ORIENTATION } from "@/lib/camera-providers";

// Simple seeded PRNG so numbers drift smoothly instead of jittering randomly
// on every render — this keeps charts readable, similar to real sensor noise.
let seed = 42;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function driftAround(base: number, amplitude: number, t: number, freq = 0.05) {
  return base + Math.sin(t * freq) * amplitude + (rand() - 0.5) * amplitude * 0.3;
}

export const SESSION_START = Date.now() - 1000 * 60 * 14; // mission "started" 14 min ago

// Flight path near a coastal survey site (Half Moon Bay, CA) — swap for real
// mission coordinates once wired to a live planner.
export const MISSION_CENTER: [number, number] = [37.4636, -122.4286];

export const WAYPOINTS: Waypoint[] = [
  { id: "wp-0", index: 0, lat: 37.4636, lng: -122.4286, label: "Launch Point", status: "completed", altitudeM: 0 },
  { id: "wp-1", index: 1, lat: 37.468, lng: -122.4231, label: "WP-01 Survey Grid A", status: "completed", altitudeM: 120 },
  { id: "wp-2", index: 2, lat: 37.4732, lng: -122.4157, label: "WP-02 Survey Grid B", status: "completed", altitudeM: 120 },
  { id: "wp-3", index: 3, lat: 37.4779, lng: -122.4079, label: "WP-03 Coastal Transect", status: "active", altitudeM: 135 },
  { id: "wp-4", index: 4, lat: 37.4825, lng: -122.3995, label: "WP-04 Ridge Overwatch", status: "pending", altitudeM: 150 },
  { id: "wp-5", index: 5, lat: 37.4869, lng: -122.3918, label: "WP-05 Return Corridor", status: "pending", altitudeM: 100 },
  { id: "wp-6", index: 6, lat: 37.4636, lng: -122.4286, label: "Recovery Point", status: "pending", altitudeM: 0 },
];

export const GEOFENCES: GeofenceZone[] = [
  {
    id: "gf-1",
    type: "geofence",
    label: "Mission Geofence",
    coordinates: [
      [37.459, -122.434],
      [37.459, -122.388],
      [37.492, -122.388],
      [37.492, -122.434],
      [37.459, -122.434],
    ],
  },
  {
    id: "rz-1",
    type: "restricted",
    label: "Restricted — Half Moon Bay Airport",
    coordinates: [
      [37.512, -122.505],
      [37.512, -122.492],
      [37.522, -122.492],
      [37.522, -122.505],
      [37.512, -122.505],
    ],
  },
];

export function getMissionStatus(): MissionStatus {
  return {
    missionName: "Coastal Survey — Sector 7G",
    missionId: "MSN-2026-0714",
    status: "active",
    operationMode: "simulation",
    px4Connection: "connected",
    gpsLock: "3D_FIX",
    flightMode: "AUTO",
    armed: true,
    missionProgressPct: 58,
    elapsedSeconds: Math.floor((Date.now() - SESSION_START) / 1000),
    etaSeconds: 642,
    pilotInCommand: "R. Okafor",
  };
}

function motorSet(t: number): MotorTelemetry[] {
  return ["FL", "FR", "RL", "RR"].map((label, i) => ({
    id: `motor-${label.toLowerCase()}`,
    label: `Motor ${label}`,
    rpm: Math.round(driftAround(6200, 180, t + i * 7)),
    currentA: Number(driftAround(8.2, 0.6, t + i * 3).toFixed(1)),
    temperatureC: Number(driftAround(41, 3, t + i * 5).toFixed(1)),
    escStatus: "nominal",
  }));
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  const t = (Date.now() - SESSION_START) / 1000;
  const battery: BatteryTelemetry = {
    percent: Math.max(12, Number((78 - t * 0.006).toFixed(1))),
    voltage: Number(driftAround(22.2, 0.3, t).toFixed(2)),
    current: Number(driftAround(14.6, 1.2, t, 0.2).toFixed(1)),
    temperatureC: Number(driftAround(34, 2, t).toFixed(1)),
    powerW: Number(driftAround(324, 20, t, 0.2).toFixed(0)),
    cellCount: 6,
    timeRemainingSeconds: Math.max(300, Math.round(1980 - t * 0.3)),
  };
  const gps: GpsTelemetry = {
    lat: 37.4779 + Math.sin(t * 0.01) * 0.0008,
    lng: -122.4079 + Math.cos(t * 0.008) * 0.0008,
    altitudeM: Number(driftAround(134, 4, t).toFixed(1)),
    satellites: 14 + Math.round(rand() * 2),
    hdop: Number((0.7 + rand() * 0.2).toFixed(2)),
    headingDeg: Math.round(driftAround(42, 6, t)) % 360,
    groundSpeedMs: Number(driftAround(9.4, 0.8, t, 0.15).toFixed(1)),
  };
  const comms: CommsTelemetry = {
    signalPct: Math.round(driftAround(88, 5, t, 0.25)),
    latencyMs: Math.round(driftAround(46, 8, t, 0.3)),
    packetLossPct: Number(Math.max(0, driftAround(0.4, 0.4, t, 0.3)).toFixed(2)),
    linkType: "RF",
  };
  const mission: MissionProgress = {
    currentWaypointIndex: 3,
    totalWaypoints: WAYPOINTS.length - 1,
    distanceRemainingM: Math.max(200, Math.round(3200 - t * 1.4)),
    etaSeconds: Math.max(60, Math.round(642 - t * 0.4)),
    windCompensationDeg: Number(driftAround(4, 2, t).toFixed(1)),
  };

  return {
    timestamp: new Date().toISOString(),
    battery,
    gps,
    motors: motorSet(t),
    comms,
    mission,
    altitudeM: gps.altitudeM,
    groundSpeedMs: gps.groundSpeedMs,
    signalPct: comms.signalPct,
    weatherRiskPct: 18,
  };
}

const HISTORY_LENGTH = 60;
export function getTelemetryHistory(): TelemetryHistoryPoint[] {
  const now = (Date.now() - SESSION_START) / 1000;
  const points: TelemetryHistoryPoint[] = [];
  for (let i = HISTORY_LENGTH; i >= 0; i--) {
    const t = now - i * 10;
    points.push({
      t: Math.max(0, Math.round(t)),
      altitudeM: Number(driftAround(134, 5, t).toFixed(1)),
      groundSpeedMs: Number(driftAround(9.4, 1, t, 0.15).toFixed(1)),
      batteryPct: Math.max(12, Number((78 - t * 0.006).toFixed(1))),
      signalPct: Math.round(driftAround(88, 5, t, 0.25)),
      voltage: Number(driftAround(22.2, 0.3, t).toFixed(2)),
      current: Number(driftAround(14.6, 1.2, t, 0.2).toFixed(1)),
    });
  }
  return points;
}

export function getAnomalies(): AnomalyEvent[] {
  return [
    {
      id: "an-1042",
      timestampISO: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      scenario: "Vibration signature drift on Motor RR during transect leg",
      affectedSubsystem: "Propulsion — Motor RR / ESC 4",
      rootCause: "Progressive bearing wear indicated by rising high-frequency vibration harmonic (2.1x baseline) correlated with a 3.4°C ESC temperature increase over 6 minutes.",
      confidencePct: 91,
      riskLevel: "moderate",
      recommendedAction: "Continue mission; schedule Motor RR inspection at next recovery.",
      suggestedMitigation: "Reduce cruise throttle 8% on affected arm to lower thermal load until recovery.",
      status: "monitoring",
      reasoningChain: [
        { id: "s1", order: 1, label: "Signal ingestion", detail: "IMU + ESC telemetry sampled at 200Hz across all four motor channels.", confidencePct: 99 },
        { id: "s2", order: 2, label: "Baseline comparison", detail: "Motor RR vibration harmonic exceeds pre-flight calibration baseline by 2.1x; other motors nominal.", confidencePct: 95 },
        { id: "s3", order: 3, label: "Correlated signal check", detail: "ESC 4 temperature trend cross-referenced — rising 0.56°C/min, consistent with increased mechanical friction.", confidencePct: 92 },
        { id: "s4", order: 4, label: "Failure mode ranking", detail: "Bearing wear ranked above imbalance or FOD strike given gradual (non-step) onset.", confidencePct: 88 },
        { id: "s5", order: 5, label: "Risk assessment", detail: "Time-to-critical-failure estimated >45 min at current degradation rate — within mission window.", confidencePct: 91 },
      ],
    },
    {
      id: "an-1039",
      timestampISO: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      scenario: "Transient GPS HDOP spike near ridge terrain",
      affectedSubsystem: "Navigation — GNSS Receiver",
      rootCause: "Multipath reflection off ridge terrain briefly degraded satellite geometry (HDOP 0.7 → 2.4) for 14 seconds.",
      confidencePct: 97,
      riskLevel: "low",
      recommendedAction: "No action required — resolved automatically as UAV cleared terrain shadow.",
      suggestedMitigation: "None required; log for post-mission terrain-masking model update.",
      status: "resolved",
      reasoningChain: [
        { id: "s1", order: 1, label: "Anomaly detection", detail: "HDOP exceeded 2.0 threshold for 14 continuous seconds.", confidencePct: 99 },
        { id: "s2", order: 2, label: "Terrain correlation", detail: "Digital elevation model shows UAV in line-of-sight shadow of ridge during the same window.", confidencePct: 96 },
        { id: "s3", order: 3, label: "Resolution confirmation", detail: "HDOP returned to 0.7–0.9 baseline within 3 seconds of clearing terrain shadow.", confidencePct: 98 },
      ],
    },
  ];
}

export function getAlerts(): AlertItem[] {
  const now = Date.now();
  return [
    { id: "al-3001", timestampISO: new Date(now - 4 * 60000).toISOString(), severity: "warning", source: "Propulsion", description: "Motor RR vibration harmonic elevated (2.1x baseline)", status: "acknowledged" },
    { id: "al-3000", timestampISO: new Date(now - 12 * 60000).toISOString(), severity: "info", source: "Mission Planner", description: "Waypoint 3 (Coastal Transect) reached", status: "resolved" },
    { id: "al-2998", timestampISO: new Date(now - 22 * 60000).toISOString(), severity: "resolved", source: "Navigation", description: "GPS HDOP spike resolved automatically after terrain clearance", status: "resolved" },
    { id: "al-2991", timestampISO: new Date(now - 41 * 60000).toISOString(), severity: "critical", source: "Power", description: "Battery cell 4 voltage imbalance detected pre-flight — resolved after recalibration", status: "resolved" },
    { id: "al-2988", timestampISO: new Date(now - 58 * 60000).toISOString(), severity: "info", source: "Comms", description: "RF link established, signal 92%", status: "resolved" },
    { id: "al-2980", timestampISO: new Date(now - 90 * 60000).toISOString(), severity: "warning", source: "Weather", description: "Wind gust 24kt exceeded advisory threshold briefly during pre-flight check", status: "resolved" },
  ];
}

export function getWeather(): WeatherSnapshot {
  const now = Date.now();
  return {
    windSpeedKph: 18,
    windDirectionDeg: 250,
    humidityPct: 64,
    pressureHpa: 1014,
    temperatureC: 17,
    visibilityKm: 12,
    rainProbabilityPct: 8,
    safeToFly: true,
    forecast: Array.from({ length: 8 }).map((_, i) => ({
      timeISO: new Date(now + i * 60 * 60 * 1000).toISOString(),
      tempC: 17 + Math.sin(i * 0.5) * 2,
      windSpeedKph: 16 + Math.cos(i * 0.4) * 6,
      rainProbabilityPct: Math.max(0, Math.round(8 + Math.sin(i) * 10)),
      safeToFly: i < 6,
    })),
  };
}

export function getCameraFeeds(): CameraFeed[] {
  return [
    {
      id: "cam-rgb",
      label: "RGB — Forward Camera",
      type: "RGB",
      source: rgbCameraSource,
      orientation: DEFAULT_FORWARD_ORIENTATION,
      detectionsAreSimulated: true,
      detections: [
        { id: "d1", label: "Vessel", confidencePct: 94, box: [22, 30, 18, 12] },
        { id: "d2", label: "Debris", confidencePct: 76, box: [58, 62, 10, 8] },
      ],
    },
    {
      id: "cam-thermal",
      label: "Thermal — Not Connected",
      type: "Thermal",
      source: thermalCameraSource,
      orientation: DEFAULT_FORWARD_ORIENTATION,
      detectionsAreSimulated: true,
      detections: [],
    },
    {
      id: "cam-depth",
      label: "Depth — Not Connected",
      type: "Depth",
      source: depthCameraSource,
      orientation: DEFAULT_FORWARD_ORIENTATION,
      detectionsAreSimulated: true,
      detections: [],
    },
  ];
}

export function getLogs(): LogEntry[] {
  const now = Date.now();
  const entries: [number, LogEntry["level"], string, string][] = [
    [1, "info", "MissionPlanner", "Waypoint 3 reached — Coastal Transect"],
    [4, "warning", "Propulsion", "Motor RR vibration harmonic exceeded baseline threshold"],
    [6, "info", "AI-Reasoning", "Anomaly AN-1042 classified: bearing wear, confidence 91%"],
    [9, "debug", "Telemetry", "Snapshot buffer flushed to local store (1024 samples)"],
    [14, "info", "Navigation", "GPS lock upgraded to 3D_FIX + DGPS correction"],
    [22, "warning", "Navigation", "HDOP spike detected (2.4) near ridge terrain"],
    [22, "info", "AI-Reasoning", "Anomaly AN-1039 auto-resolved after terrain clearance"],
    [35, "info", "Comms", "RF link handoff to secondary relay completed"],
    [41, "error", "Power", "Cell 4 voltage imbalance flagged pre-arm"],
    [42, "info", "Power", "Cell 4 imbalance resolved after recalibration cycle"],
    [58, "info", "Comms", "Telemetry uplink established, signal 92%"],
    [63, "info", "System", "Pre-flight checklist passed — 42/42 items"],
  ];
  return entries.map(([minsAgo, level, component, message], i) => ({
    id: `log-${1000 - i}`,
    timestampISO: new Date(now - minsAgo * 60000).toISOString(),
    level,
    component,
    message,
  }));
}

export function getArchivedMissions(): ArchivedMission[] {
  return [
    { id: "MSN-2026-0713", name: "Ridge Line Thermal Survey", dateISO: "2026-07-13T09:20:00Z", durationSeconds: 3120, distanceKm: 14.2, outcome: "completed", anomalyCount: 0, pilot: "R. Okafor" },
    { id: "MSN-2026-0709", name: "Coastal Debris Mapping", dateISO: "2026-07-09T07:05:00Z", durationSeconds: 2640, distanceKm: 11.6, outcome: "anomaly-recovered", anomalyCount: 2, pilot: "S. Malhotra" },
    { id: "MSN-2026-0702", name: "Wind Farm Inspection Loop", dateISO: "2026-07-02T13:40:00Z", durationSeconds: 4460, distanceKm: 22.8, outcome: "completed", anomalyCount: 1, pilot: "R. Okafor" },
    { id: "MSN-2026-0628", name: "Emergency RTL — Battery Fault", dateISO: "2026-06-28T16:12:00Z", durationSeconds: 980, distanceKm: 4.1, outcome: "aborted", anomalyCount: 3, pilot: "J. Petrov" },
    { id: "MSN-2026-0621", name: "Agricultural Multispectral Pass", dateISO: "2026-06-21T08:00:00Z", durationSeconds: 5320, distanceKm: 28.4, outcome: "completed", anomalyCount: 0, pilot: "S. Malhotra" },
  ];
}

// ---------------------------------------------------------------------------
// GIS overlay mock data — replace with real providers per src/lib/map-providers.ts
// ---------------------------------------------------------------------------

export function getAirQualityZones(): AirQualityZone[] {
  const zones: [number, number, number, AirQualityZone["category"], string, string][] = [
    [37.463, -122.428, 42, "Good", "PM2.5", "Air quality is satisfactory; ideal for extended outdoor flight operations."],
    [37.478, -122.408, 68, "Moderate", "Ozone", "Unusually sensitive individuals should consider limiting prolonged exertion."],
    [37.49, -122.395, 118, "Unhealthy for Sensitive Groups", "PM2.5", "Sensitive crew members should reduce prolonged outdoor exposure."],
    [37.455, -122.44, 35, "Good", "PM10", "Air quality is satisfactory across the launch corridor."],
  ];
  return zones.map(([lat, lng, aqi, category, pollutant, advisory], i) => ({
    id: `aqi-${i}`,
    center: [lat, lng],
    radiusM: 900 + i * 150,
    aqi,
    category,
    primaryPollutant: pollutant,
    healthAdvisory: advisory,
  }));
}

export function getWildfireZones(): WildfireZone[] {
  return [
    {
      id: "wf-1",
      label: "Elevated Risk — Ridge Dry Vegetation",
      risk: "moderate",
      coordinates: [
        [37.487, -122.402],
        [37.487, -122.392],
        [37.494, -122.392],
        [37.494, -122.402],
      ],
      smokeDirectionDeg: 110,
    },
    {
      id: "wf-2",
      label: "Safe — Coastal Marine Layer",
      risk: "safe",
      coordinates: [
        [37.458, -122.436],
        [37.458, -122.42],
        [37.466, -122.42],
        [37.466, -122.436],
      ],
    },
  ];
}

export function getOperatorProfile(): OperatorProfile {
  return {
    id: "OP-8821",
    fullName: "R. Okafor",
    role: "Senior UAV Pilot / Mission Commander",
    organization: "MARE Aerospace Operations",
    email: "r.okafor@mare-ops.example",
    avatarInitials: "RO",
    missionHours: 1284,
    completedMissions: 96,
    currentStatus: "On Duty",
    joinedISO: "2022-03-14T00:00:00Z",
    lastLoginISO: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    systemVersion: "v2.4.1-rc3",
  };
}

export function getCertifications(): Certification[] {
  return [
    { id: "cert-1", name: "Part 107 Remote Pilot Certificate", authority: "FAA", type: "Drone License", issuedISO: "2023-01-10T00:00:00Z", expiresISO: "2027-01-10T00:00:00Z", status: "valid", issuedBy: "Federal Aviation Administration" },
    { id: "cert-2", name: "BVLOS Waiver — Extended Operations", authority: "FAA", type: "Certification", issuedISO: "2024-05-02T00:00:00Z", expiresISO: "2026-11-02T00:00:00Z", status: "expiring-soon", issuedBy: "Federal Aviation Administration" },
    { id: "cert-3", name: "Autonomous Systems Safety Training", authority: "Internal", type: "Training Certificate", issuedISO: "2025-02-18T00:00:00Z", expiresISO: "2027-02-18T00:00:00Z", status: "valid", issuedBy: "MARE Aerospace Operations" },
    { id: "cert-4", name: "DGCA Remote Pilot License", authority: "DGCA", type: "Drone License", issuedISO: "2022-09-01T00:00:00Z", expiresISO: "2025-09-01T00:00:00Z", status: "expired", issuedBy: "Directorate General of Civil Aviation" },
  ];
}
