import axios from "axios";
import type {
  AirQualityZone,
  AlertItem,
  AnomalyEvent,
  ArchivedMission,
  CameraFeed,
  Certification,
  ChatMessage,
  CommandResponse,
  FlightCommandName,
  GeofenceZone,
  GotoRequest,
  HealthStatus,
  LiveTelemetry,
  LogEntry,
  MissionStatus,
  MissionWaypointPayload,
  OperatorProfile,
  ReasoningReport,
  TelemetryHistoryPoint,
  TelemetrySnapshot,
  Waypoint,
  WeatherSnapshot,
  WildfireZone,
} from "@/types/mission";
import * as mock from "./mockData";

// ---------------------------------------------------------------------------
// LIVE BACKEND — FastAPI + PX4 SITL integration
//
// Base URL comes from VITE_API_URL (set it in .env.local), defaulting to the
// standard local FastAPI dev address. All flight-critical data (telemetry,
// AI reasoning, flight commands, health) goes through this client.
// ---------------------------------------------------------------------------

export const DRONE_API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export const droneApi = axios.create({
  baseURL: DRONE_API_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// GET /health — backend + PX4 connection status
export async function getHealth(): Promise<HealthStatus> {
  const { data } = await droneApi.get<HealthStatus>("/health");
  return data;
}

// GET /telemetry — live drone telemetry snapshot
export async function getTelemetry(): Promise<LiveTelemetry> {
  const { data } = await droneApi.get<LiveTelemetry>("/telemetry");
  return data;
}

// GET /reasoning — triggers Gemini AI and returns a diagnostic report
// KNOWN MISMATCH: the real response is { diagnostic_report: { calculated_risk_percent,
// ai_analysis } }, not this ReasoningReport shape. Left as-is — out of scope for
// Step 3 (telemetry + mission sync). See HANDOFF_STEP_02.md §1/§2 and
// HANDOFF_STEP_03.md "known limitations".
export async function getReasoning(): Promise<ReasoningReport> {
  const { data } = await droneApi.get<ReasoningReport>("/reasoning");
  return data;
}

// POST /connect, /arm, /disarm, /land, /hold, /rtl, /emergency_stop — no body
async function postCommand(command: Exclude<FlightCommandName, "takeoff">): Promise<CommandResponse> {
  const { data } = await droneApi.post<CommandResponse>(`/${command}`);
  return data;
}

export const connectDrone = () => postCommand("connect");
export const armDrone = () => postCommand("arm");
export const disarmDrone = () => postCommand("disarm");
export const landDrone = () => postCommand("land");
export const holdDrone = () => postCommand("hold");
export const returnToLaunch = () => postCommand("rtl");
export const emergencyStopDrone = () => postCommand("emergency_stop");

// POST /takeoff — the one command that takes a body ({ altitude_m }); the
// FastAPI route defaults to 10.0 if omitted, but we always send it explicitly
// so the operator's chosen altitude (not a silent server default) is what flies.
export async function takeoffDrone(altitudeM = 10.0): Promise<CommandResponse> {
  const { data } = await droneApi.post<CommandResponse>("/takeoff", { altitude_m: altitudeM });
  return data;
}

// POST /goto — fly directly to an arbitrary point. This is the real mechanism
// for "custom destination" (Requirement 2) — see HANDOFF_STEP_02.md §1/§3.
export async function gotoLocation(req: GotoRequest): Promise<CommandResponse> {
  const { data } = await droneApi.post<CommandResponse>("/goto", req);
  return data;
}

// POST /mission/upload — upload a full waypoint list (origin/waypoints/destination
// flattened into the shape PX4 expects). Real mission-plan mechanism; no fabricated
// "success" — if this rejects, the caller must surface the failure, not assume upload worked.
export async function uploadMission(waypoints: MissionWaypointPayload[]): Promise<CommandResponse> {
  const { data } = await droneApi.post<CommandResponse>("/mission/upload", { waypoints });
  return data;
}

// POST /mission/start — begin executing the previously uploaded mission.
export async function startMission(): Promise<CommandResponse> {
  const { data } = await droneApi.post<CommandResponse>("/mission/start");
  return data;
}

// ---------------------------------------------------------------------------
// MOCK DATA — dashboard sections with no corresponding FastAPI endpoint yet
// (weather, cameras, alerts log, logs, archive, operator profile, copilot
// chat, mission waypoints/geofences). Swap these for real calls the same way
// as above once those endpoints exist; components only depend on the return
// types, not on where the data comes from.
// ---------------------------------------------------------------------------

const LATENCY_MS = 120;
function resolveAfter<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export async function fetchMissionStatus(): Promise<MissionStatus> {
  return resolveAfter(mock.getMissionStatus());
}

export async function fetchTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  return resolveAfter(mock.getTelemetrySnapshot());
}

export async function fetchTelemetryHistory(): Promise<TelemetryHistoryPoint[]> {
  return resolveAfter(mock.getTelemetryHistory());
}

export async function fetchWaypoints(): Promise<Waypoint[]> {
  return resolveAfter(mock.WAYPOINTS);
}

export async function fetchGeofences(): Promise<GeofenceZone[]> {
  return resolveAfter(mock.GEOFENCES);
}

export async function fetchAnomalies(): Promise<AnomalyEvent[]> {
  return resolveAfter(mock.getAnomalies());
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return resolveAfter(mock.getAlerts());
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
  return resolveAfter(mock.getWeather());
}

export async function fetchCameraFeeds(): Promise<CameraFeed[]> {
  return resolveAfter(mock.getCameraFeeds());
}

export async function fetchLogs(): Promise<LogEntry[]> {
  return resolveAfter(mock.getLogs());
}

export async function fetchArchivedMissions(): Promise<ArchivedMission[]> {
  return resolveAfter(mock.getArchivedMissions());
}

export async function fetchAirQualityZones(): Promise<AirQualityZone[]> {
  return resolveAfter(mock.getAirQualityZones());
}

export async function fetchWildfireZones(): Promise<WildfireZone[]> {
  return resolveAfter(mock.getWildfireZones());
}

export async function fetchOperatorProfile(): Promise<OperatorProfile> {
  return resolveAfter(mock.getOperatorProfile());
}

export async function updateOperatorProfile(patch: Partial<OperatorProfile>): Promise<OperatorProfile> {
  return resolveAfter({ ...mock.getOperatorProfile(), ...patch });
}

export async function fetchCertifications(): Promise<Certification[]> {
  return resolveAfter(mock.getCertifications());
}

const COPILOT_RESPONSES: Record<string, string> = {
  battery:
    "Battery is at 71% with a stable discharge curve — voltage and cell temperature are within nominal range. Estimated time remaining at current draw is ~31 minutes, well inside the mission window.",
  anomaly:
    "The active anomaly (AN-1042) is a gradual vibration drift on Motor RR consistent with early bearing wear. Confidence is 91%. It's not mission-critical yet — I'd recommend continuing and flagging Motor RR for inspection at recovery.",
  weather:
    "Current conditions are within safe-to-fly limits: wind 18 km/h from the WSW, 8% rain probability, 12km visibility. The forecast shows conditions holding steady for the next 4 hours before wind picks up slightly.",
  route:
    "Given current wind compensation (4.1°) and remaining battery margin, the planned route to WP-05 is still optimal. An alternate corridor south of the ridge would save ~40s but passes closer to the restricted zone boundary.",
  default:
    "I've cross-checked telemetry, the AI reasoning log, and current weather — everything is nominal outside the Motor RR advisory. Ask me about battery, the active anomaly, weather, or route options for more detail.",
};

export async function sendCopilotMessage(message: string): Promise<ChatMessage> {
  const key = Object.keys(COPILOT_RESPONSES).find((k) => message.toLowerCase().includes(k));
  const content = COPILOT_RESPONSES[key ?? "default"];
  return resolveAfter({
    id: `msg-${Date.now()}`,
    role: "assistant",
    content,
    timestampISO: new Date().toISOString(),
  });
}
