import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/services/api";
import { useMissionStore } from "@/store/missionStore";
import type { HealthStatus, LiveTelemetry } from "@/types/mission";

// ---------------------------------------------------------------------------
// LIVE BACKEND — polls GET /health and GET /telemetry directly (not via
// TanStack Query) at 2Hz, per the PX4 bridge's expected refresh rate.
//
// Why two endpoints, not one: /telemetry has no `connected` field — the
// backend transparently falls back to its own mock provider and keeps
// answering /telemetry even when PX4 is fully disconnected (see
// HANDOFF_STEP_02.md §1, HANDOFF_STEP_03.md "telemetry flow"). Connection
// truth and live/simulation mode only exist on /health. Reading `armed` off
// /telemetry and inferring "connected" from it (as an earlier version of
// this hook did) would have been wrong — it can't distinguish "PX4 armed and
// flying" from "backend serving mock data while PX4 is unreachable."
//
// Staleness is tracked client-side because the Telemetry model has no
// timestamp field — see HANDOFF_STEP_02.md §1.
// ---------------------------------------------------------------------------

const STALE_AFTER_MS = 3000; // 3 missed 500ms polls

interface UseLiveTelemetryResult {
  telemetry: LiveTelemetry | null;
  health: HealthStatus | null;
  isLoading: boolean;
  /** Backend-unreachable error (network failure, CORS, backend process down) — distinct from PX4 being disconnected. */
  backendError: string | null;
  /** True once /health has answered at least once and reports px4_connected. */
  connected: boolean;
  /** "live" = real PX4 data, "simulation" = backend's own mock fallback, "unknown" = no successful /health yet. */
  mode: "live" | "simulation" | "unknown";
  /** No successful /telemetry response within STALE_AFTER_MS — render last-known data but flag it. */
  isStale: boolean;
  lastUpdatedAt: number | null;
}

export function useLiveTelemetry(pollMs = 500): UseLiveTelemetryResult {
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const requestId = useRef(0);
  const lastTelemetryAtRef = useRef<number | null>(null);
  const syncFromTelemetry = useMissionStore((s) => s.syncFromTelemetry);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const thisRequest = ++requestId.current;

      const [telemetryResult, healthResult] = await Promise.allSettled([api.getTelemetry(), api.getHealth()]);

      if (cancelled || thisRequest !== requestId.current) return;

      if (telemetryResult.status === "fulfilled") {
        setTelemetry(telemetryResult.value);
        setBackendError(null);
        lastTelemetryAtRef.current = Date.now();
        setLastUpdatedAt(lastTelemetryAtRef.current);
        syncFromTelemetry(telemetryResult.value);
      } else {
        const err = telemetryResult.reason;
        setBackendError(err instanceof Error ? err.message : "Failed to reach the MARE backend");
      }

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      }
      // A failed /health poll doesn't overwrite the last-known health — a
      // single dropped poll shouldn't flip the connection badge; backendError
      // (from the telemetry poll above) already surfaces backend-unreachable.

      setIsStale(lastTelemetryAtRef.current === null || Date.now() - lastTelemetryAtRef.current > STALE_AFTER_MS);
      setIsLoading(false);
    };

    poll();
    const id = setInterval(poll, pollMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs, syncFromTelemetry]);

  return {
    telemetry,
    health,
    isLoading,
    backendError,
    connected: health?.px4_connected ?? false,
    mode: health?.mode ?? "unknown",
    isStale,
    lastUpdatedAt,
  };
}

export function useMissionStatus() {
  return useQuery({ queryKey: ["mission-status"], queryFn: api.fetchMissionStatus, refetchInterval: 5000 });
}

export function useTelemetrySnapshot() {
  return useQuery({ queryKey: ["telemetry-snapshot"], queryFn: api.fetchTelemetrySnapshot, refetchInterval: 2000 });
}

export function useTelemetryHistory() {
  return useQuery({ queryKey: ["telemetry-history"], queryFn: api.fetchTelemetryHistory, refetchInterval: 10000 });
}

export function useWaypoints() {
  return useQuery({ queryKey: ["waypoints"], queryFn: api.fetchWaypoints, refetchInterval: 8000 });
}

export function useGeofences() {
  return useQuery({ queryKey: ["geofences"], queryFn: api.fetchGeofences, staleTime: Infinity });
}

export function useAnomalies() {
  return useQuery({ queryKey: ["anomalies"], queryFn: api.fetchAnomalies, refetchInterval: 8000 });
}

export function useAlerts() {
  return useQuery({ queryKey: ["alerts"], queryFn: api.fetchAlerts, refetchInterval: 8000 });
}

export function useWeather() {
  return useQuery({ queryKey: ["weather"], queryFn: api.fetchWeather, refetchInterval: 30000 });
}

export function useCameraFeeds() {
  return useQuery({ queryKey: ["camera-feeds"], queryFn: api.fetchCameraFeeds, refetchInterval: 5000 });
}

export function useLogs() {
  return useQuery({ queryKey: ["logs"], queryFn: api.fetchLogs, refetchInterval: 10000 });
}

export function useArchivedMissions() {
  return useQuery({ queryKey: ["archived-missions"], queryFn: api.fetchArchivedMissions, staleTime: Infinity });
}

export function useAirQualityZones(enabled: boolean) {
  return useQuery({ queryKey: ["air-quality"], queryFn: api.fetchAirQualityZones, enabled, staleTime: 5 * 60 * 1000 });
}

export function useWildfireZones(enabled: boolean) {
  return useQuery({ queryKey: ["wildfire-zones"], queryFn: api.fetchWildfireZones, enabled, staleTime: 5 * 60 * 1000 });
}

export function useOperatorProfile() {
  return useQuery({ queryKey: ["operator-profile"], queryFn: api.fetchOperatorProfile, staleTime: 60 * 1000 });
}

export function useCertifications() {
  return useQuery({ queryKey: ["certifications"], queryFn: api.fetchCertifications, staleTime: 5 * 60 * 1000 });
}
