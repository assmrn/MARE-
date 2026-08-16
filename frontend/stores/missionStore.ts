import { create } from "zustand";
import * as api from "@/services/api";
import type { DraftMissionPoint, DraftPointKind, LiveTelemetry, MissionSyncStatus, PlanningMode } from "@/types/mission";

interface MissionState {
  points: DraftMissionPoint[];
  status: MissionSyncStatus;
  planningMode: PlanningMode;
  uploadError: string | null;
  lastSyncedFlightMode: string | null;

  setPlanningMode: (mode: PlanningMode) => void;
  placePoint: (kind: DraftPointKind, lat: number, lng: number) => void;
  removePoint: (id: string) => void;
  clearMission: () => void;

  /** Validates + uploads the draft plan, then starts it. Never claims success it didn't observe. */
  uploadAndStart: () => Promise<void>;

  /**
   * Called on every real telemetry tick once a mission has been uploaded.
   * Infers EXECUTING / PAUSED / COMPLETED from armed + flight_mode, since the
   * backend does not expose explicit mission-progress state (no GET /mission,
   * no mission.mission_progress() stream wired up yet — see
   * HANDOFF_STEP_03.md "known limitations"). This is a heuristic, not a
   * ground-truth read of PX4 mission state, and is documented as such.
   */
  syncFromTelemetry: (telemetry: LiveTelemetry) => void;
}

function makeId() {
  return `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_ALT_M = 20;
const DEFAULT_SPEED_MS = 10;

export const useMissionStore = create<MissionState>((set, get) => ({
  points: [],
  status: "PLANNED",
  planningMode: "none",
  uploadError: null,
  lastSyncedFlightMode: null,

  setPlanningMode: (mode) => set({ planningMode: mode }),

  placePoint: (kind, lat, lng) => {
    const point: DraftMissionPoint = {
      id: makeId(),
      kind,
      lat,
      lng,
      alt: kind === "origin" ? 0 : DEFAULT_ALT_M,
      speed: DEFAULT_SPEED_MS,
    };
    set((state) => {
      // Origin and destination are singletons — placing a new one replaces the old one.
      // Waypoints accumulate in the order placed.
      const withoutSameKindSingleton =
        kind === "waypoint" ? state.points : state.points.filter((p) => p.kind !== kind);
      return {
        points: [...withoutSameKindSingleton, point],
        planningMode: "none",
        status: state.status === "PLANNED" ? "PLANNED" : state.status, // placing points doesn't un-upload a mission; use Clear for that
      };
    });
  },

  removePoint: (id) => set((state) => ({ points: state.points.filter((p) => p.id !== id) })),

  clearMission: () =>
    set({ points: [], status: "PLANNED", planningMode: "none", uploadError: null, lastSyncedFlightMode: null }),

  uploadAndStart: async () => {
    const { points } = get();
    const origin = points.find((p) => p.kind === "origin");
    const destination = points.find((p) => p.kind === "destination");
    const waypoints = points.filter((p) => p.kind === "waypoint");

    if (!origin || !destination) {
      set({ status: "FAILED", uploadError: "A mission needs both an origin and a destination before it can be uploaded." });
      return;
    }

    // Ordered exactly as PX4 will fly it: origin leg first, then waypoints in
    // placement order, then destination. This is the frontend's mission
    // model — the backend has no opinion on ordering beyond the array we send.
    const ordered = [origin, ...waypoints, destination];
    const payload = ordered.map((p) => ({ lat: p.lat, lng: p.lng, alt: p.alt, speed: p.speed }));

    set({ status: "UPLOADING", uploadError: null });
    try {
      await api.uploadMission(payload);
    } catch (err) {
      set({ status: "FAILED", uploadError: describeError(err, "Mission upload") });
      return; // do not attempt to start a mission that didn't upload
    }

    set({ status: "UPLOADED" });

    try {
      await api.startMission();
    } catch (err) {
      // Upload succeeded but start failed — this is a real, distinct state:
      // the vehicle has the plan but isn't executing it. Report precisely.
      set({ status: "FAILED", uploadError: describeError(err, "Mission uploaded, but starting it") });
    }
  },

  syncFromTelemetry: (telemetry) => {
    const { status } = get();
    if (status !== "UPLOADED" && status !== "EXECUTING" && status !== "PAUSED") return;

    const mode = telemetry.flight_mode;
    const isMissionMode = mode.includes("MISSION") || mode.includes("AUTO");
    const isHold = mode === "HOLD";

    if ((status === "UPLOADED" || status === "PAUSED") && telemetry.armed && isMissionMode) {
      set({ status: "EXECUTING", lastSyncedFlightMode: mode });
    } else if (status === "EXECUTING" && isHold) {
      set({ status: "PAUSED", lastSyncedFlightMode: mode });
    } else if ((status === "EXECUTING" || status === "PAUSED") && !telemetry.armed) {
      // Heuristic: disarming after having executed most likely means landed/
      // completed. Cannot distinguish from an emergency stop with the fields
      // currently exposed — see HANDOFF_STEP_03.md "known limitations".
      set({ status: "COMPLETED", lastSyncedFlightMode: mode });
    }
  },
}));

function describeError(err: unknown, context: string): string {
  if (err && typeof err === "object" && "response" in err) {
    // Axios error with a FastAPI { detail: "..." } body
    const response = (err as { response?: { data?: { detail?: string }; status?: number } }).response;
    if (response?.status === 503) return `${context} failed: PX4 is not connected.`;
    if (response?.data?.detail) return `${context} failed: ${response.data.detail}`;
  }
  if (err instanceof Error) return `${context} failed: ${err.message}`;
  return `${context} failed: unknown error`;
}
