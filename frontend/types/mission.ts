// ---------------------------------------------------------------------------
// Domain types. These describe the shape mock data currently follows and are
// the contract that a real telemetry/PX4 bridge API should satisfy when it
// replaces src/services/*. Nothing in the component layer should need to
// change if a real backend returns data matching these interfaces.
// ---------------------------------------------------------------------------

export type FlightMode = "MANUAL" | "STABILIZE" | "AUTO" | "GUIDED" | "LOITER" | "RTL" | "LAND" | "HOLD";
export type ConnectionState = "connected" | "degraded" | "disconnected";
export type OperationMode = "live" | "simulation";
export type Severity = "critical" | "warning" | "info" | "resolved";
export type RiskLevel = "low" | "moderate" | "elevated" | "critical";

export interface MissionStatus {
  missionName: string;
  missionId: string;
  status: "active" | "paused" | "completed" | "aborted" | "standby";
  operationMode: OperationMode;
  px4Connection: ConnectionState;
  gpsLock: "3D_FIX" | "2D_FIX" | "NO_FIX" | "DGPS";
  flightMode: FlightMode;
  armed: boolean;
  missionProgressPct: number;
  elapsedSeconds: number;
  etaSeconds: number;
  pilotInCommand: string;
}

export interface BatteryTelemetry {
  percent: number;
  voltage: number;
  current: number;
  temperatureC: number;
  powerW: number;
  cellCount: number;
  timeRemainingSeconds: number;
}

export interface GpsTelemetry {
  lat: number;
  lng: number;
  altitudeM: number;
  satellites: number;
  hdop: number;
  headingDeg: number;
  groundSpeedMs: number;
}

export interface MotorTelemetry {
  id: string;
  label: string;
  rpm: number;
  currentA: number;
  temperatureC: number;
  escStatus: "nominal" | "warning" | "fault";
}

export interface CommsTelemetry {
  signalPct: number;
  latencyMs: number;
  packetLossPct: number;
  linkType: "RF" | "LTE" | "SATCOM";
}

export interface MissionProgress {
  currentWaypointIndex: number;
  totalWaypoints: number;
  distanceRemainingM: number;
  etaSeconds: number;
  windCompensationDeg: number;
}

export interface TelemetrySnapshot {
  timestamp: string;
  battery: BatteryTelemetry;
  gps: GpsTelemetry;
  motors: MotorTelemetry[];
  comms: CommsTelemetry;
  mission: MissionProgress;
  altitudeM: number;
  groundSpeedMs: number;
  signalPct: number;
  weatherRiskPct: number;
}

export interface TelemetryHistoryPoint {
  t: number; // seconds relative to session start
  altitudeM: number;
  groundSpeedMs: number;
  batteryPct: number;
  signalPct: number;
  voltage: number;
  current: number;
}

export interface Waypoint {
  id: string;
  index: number;
  lat: number;
  lng: number;
  label: string;
  status: "completed" | "active" | "pending";
  altitudeM: number;
  etaISO?: string;
}

export interface GeofenceZone {
  id: string;
  type: "geofence" | "restricted";
  label: string;
  coordinates: [number, number][];
}

export interface ReasoningStep {
  id: string;
  order: number;
  label: string;
  detail: string;
  confidencePct: number;
}

export interface AnomalyEvent {
  id: string;
  timestampISO: string;
  scenario: string;
  affectedSubsystem: string;
  rootCause: string;
  confidencePct: number;
  riskLevel: RiskLevel;
  recommendedAction: string;
  suggestedMitigation: string;
  reasoningChain: ReasoningStep[];
  status: "active" | "monitoring" | "resolved";
}

export interface AlertItem {
  id: string;
  timestampISO: string;
  severity: Severity;
  source: string;
  description: string;
  status: "open" | "acknowledged" | "resolved";
}

export interface WeatherForecastPoint {
  timeISO: string;
  tempC: number;
  windSpeedKph: number;
  rainProbabilityPct: number;
  safeToFly: boolean;
}

export interface WeatherSnapshot {
  windSpeedKph: number;
  windDirectionDeg: number;
  humidityPct: number;
  pressureHpa: number;
  temperatureC: number;
  visibilityKm: number;
  rainProbabilityPct: number;
  safeToFly: boolean;
  forecast: WeatherForecastPoint[];
}

// ---------------------------------------------------------------------------
// Camera / video source abstraction
//
// No video transport exists in the backend today (confirmed in
// HANDOFF_STEP_04.md — no GStreamer/RTSP/WebRTC/MJPEG anywhere in the
// uploaded backend or Gazebo config). This models what a real source WOULD
// look like once one exists, and renders an honest "not connected" state
// otherwise — never a gradient standing in for a real feed.
// ---------------------------------------------------------------------------

export type CameraTransport = "none" | "mjpeg" | "hls" | "webrtc";
export type CameraConnectionStatus = "unavailable" | "connecting" | "live" | "error";

export interface CameraSourceConfig {
  transport: CameraTransport;
  url: string | null;
}

/**
 * Mounting + optics metadata. None of this comes from telemetry — PX4/MAVLink
 * doesn't carry it — it's fixed camera/simulator configuration. Defaults here
 * are a documented assumption (forward-facing, level, 90°x60° FOV), not a
 * measured value from any real or simulated camera. Confirm against the
 * actual camera plugin/hardware spec before treating these as accurate.
 */
export interface CameraOrientation {
  mountYawOffsetDeg: number; // relative to drone body forward; 0 = straight ahead
  mountPitchDeg: number; // 0 = level, negative = looking down
  fovHorizontalDeg: number;
  fovVerticalDeg: number;
}

export interface DetectionBox {
  id: string;
  label: string;
  confidencePct: number;
  box: [number, number, number, number]; // [left%, top%, width%, height%]
}

export interface CameraFeed {
  id: string;
  label: string;
  type: "RGB" | "Thermal" | "Depth";
  source: CameraSourceConfig;
  orientation: CameraOrientation;
  /** Detections are demo/simulated data unless a real detection pipeline is wired in — see HANDOFF_STEP_04.md. */
  detections: DetectionBox[];
  detectionsAreSimulated: boolean;
}

export interface LogEntry {
  id: string;
  timestampISO: string;
  level: "debug" | "info" | "warning" | "error";
  component: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestampISO: string;
}

export interface ArchivedMission {
  id: string;
  name: string;
  dateISO: string;
  durationSeconds: number;
  distanceKm: number;
  outcome: "completed" | "aborted" | "anomaly-recovered";
  anomalyCount: number;
  pilot: string;
}

// ---------------------------------------------------------------------------
// Map / GIS overlay layers
// ---------------------------------------------------------------------------

export type WeatherLayerMode = "temperature" | "rainfall" | "wind" | "clouds";

export interface MapLayerState {
  publicTransport: boolean;
  liveTraffic: boolean;
  bicycleRoutes: boolean;
  buildings3D: boolean;
  streetView: boolean;
  wildfires: boolean;
  airQuality: boolean;
  weatherZones: boolean;
  weatherMode: WeatherLayerMode;
}

export type AqiCategory = "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous";

export interface AirQualityZone {
  id: string;
  center: [number, number];
  radiusM: number;
  aqi: number;
  category: AqiCategory;
  primaryPollutant: string;
  healthAdvisory: string;
}

export type WildfireRisk = "safe" | "moderate" | "high" | "active";

export interface WildfireZone {
  id: string;
  coordinates: [number, number][];
  risk: WildfireRisk;
  label: string;
  smokeDirectionDeg?: number;
  acresBurning?: number;
}

// ---------------------------------------------------------------------------
// Operator profile & certifications
// ---------------------------------------------------------------------------

export interface OperatorProfile {
  id: string;
  fullName: string;
  role: string;
  organization: string;
  email: string;
  avatarInitials: string;
  missionHours: number;
  completedMissions: number;
  currentStatus: "On Duty" | "Off Duty" | "Standby";
  joinedISO: string;
  lastLoginISO: string;
  systemVersion: string;
}

export interface Certification {
  id: string;
  name: string;
  authority: "FAA" | "DGCA" | "EASA" | "Internal";
  type: "Drone License" | "Certification" | "Training Certificate";
  issuedISO: string;
  expiresISO: string;
  status: "valid" | "expiring-soon" | "expired";
  issuedBy: string;
}

// ---------------------------------------------------------------------------
// Live FastAPI / PX4 backend contract
//
// These match the ACTUAL Pydantic models in the uploaded backend
// (telemetry/models.py, app.py) — confirmed in HANDOFF_STEP_02.md, not
// guessed. Do not "flatten" these to make frontend code simpler; the
// nesting matches the wire format exactly so no silent field-mapping bugs
// can hide here.
// ---------------------------------------------------------------------------

export interface HealthStatus {
  backend: string; // e.g. "online"
  px4_connected: boolean;
  mode: "live" | "simulation";
}

export interface BatteryDTO {
  voltage: number;
  current: number;
  percentage: number;
  temperature: number;
}

export interface MotorDTO {
  id: number;
  rpm: number;
  current: number;
  temperature: number;
}

export interface GpsDTO {
  satellites: number;
  hdop: number;
  latitude: number;
  longitude: number;
  altitude: number; // relative altitude / AGL, per mavsdk_service.py's position.relative_altitude_m
}

export interface CommunicationDTO {
  signal_strength: number;
  packet_loss: number;
  latency: number;
}

export interface MissionTelemetryDTO {
  phase: string; // flight_mode string today, e.g. "HOLD", "MISSION", "TAKEOFF" — see HANDOFF_STEP_02.md §1
  waypoint: number;
  altitude: number;
}

// GET /telemetry — exact shape from telemetry/models.py::Telemetry
export interface LiveTelemetry {
  battery: BatteryDTO;
  motors: MotorDTO[];
  gps: GpsDTO;
  communication: CommunicationDTO;
  mission: MissionTelemetryDTO;
  velocity_ms: number;
  heading_deg: number;
  flight_mode: string;
  armed: boolean;
  home_lat: number; // present in the model but never populated by mavsdk_service.py today — always 0.0
  home_lng: number;
}

export interface ReasoningStepDTO {
  step: number;
  label: string;
  detail: string;
  confidence_pct: number;
}

// NOTE: this does NOT match the real /reasoning payload
// ({ diagnostic_report: { calculated_risk_percent, ai_analysis } }) — see
// HANDOFF_STEP_02.md §1/§2/§6. Left unchanged; out of scope for Step 3
// (telemetry + mission sync), tracked as a Step 4 candidate.
export interface ReasoningReport {
  scenario: string;
  confidence_pct: number;
  affected_subsystem: string;
  root_cause: string;
  risk_level: "low" | "moderate" | "elevated" | "critical";
  recommended_action: string;
  suggested_mitigation: string;
  reasoning_chain: ReasoningStepDTO[];
  generated_at: string;
}

export type FlightCommandName =
  | "connect"
  | "arm"
  | "disarm"
  | "takeoff"
  | "land"
  | "hold"
  | "rtl"
  | "emergency_stop";

// Real shape for POST /connect|/arm|/disarm|/takeoff|/land|/hold|/rtl|/emergency_stop
// Success: { status: "success", action: "arm" }. Failures throw (Axios) with
// FastAPI's { detail: "..." } body — handled at the call site, not modeled here.
export interface CommandResponse {
  status: string;
  action: string;
}

export interface GotoRequest {
  lat: number;
  lng: number;
  alt_m: number;
  yaw_deg?: number;
}

export interface MissionWaypointPayload {
  lat: number;
  lng: number;
  alt: number;
  speed: number;
}

// ---------------------------------------------------------------------------
// Mission planning / upload model — this is a FRONTEND concept. The backend
// has no persisted "mission" resource to read back (no GET /mission), so the
// dashboard is the source of truth for the draft plan up until upload, and
// defers to real telemetry (armed/flight_mode/mission.phase) once uploaded —
// see HANDOFF_STEP_03.md "State synchronization flow" for the exact rules.
// ---------------------------------------------------------------------------

export type MissionSyncStatus =
  | "PLANNED"
  | "UPLOADING"
  | "UPLOADED"
  | "EXECUTING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type DraftPointKind = "origin" | "waypoint" | "destination";

export interface DraftMissionPoint {
  id: string;
  kind: DraftPointKind;
  lat: number;
  lng: number;
  alt: number;
  speed: number;
}

export type PlanningMode = "none" | "origin" | "waypoint" | "destination";
