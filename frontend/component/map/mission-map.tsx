import { useMemo, useState } from "react";
import { MapContainer, TileLayer, LayersControl, Marker, Polyline, Polygon, Tooltip, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Maximize2, Box, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGeofences, useLiveTelemetry, useWaypoints } from "@/hooks/useMissionData";
import { useMissionStore } from "@/store/missionStore";
import { MISSION_CENTER } from "@/services/mockData";
import { cn } from "@/lib/utils";
import { providers, streetMapProvider, satelliteMapProvider, terrainMapProvider } from "@/lib/map-providers";
import type { MapLayerState, WeatherLayerMode } from "@/types/mission";

import { LayersMenu } from "./layers-menu";
import { WeatherOverlayLayer } from "./layers/weather-overlay-layer";
import { AirQualityOverlayLayer } from "./layers/air-quality-overlay-layer";
import { WildfireOverlayLayer } from "./layers/wildfire-overlay-layer";
import { TrafficOverlayLayer } from "./layers/traffic-overlay-layer";
import { TransitOverlayLayer } from "./layers/transit-overlay-layer";
import { BicycleOverlayLayer } from "./layers/bicycle-overlay-layer";
import { StreetViewClickHandler, StreetViewModal } from "./layers/street-view";
import { ProviderRequiredNote } from "./layers/provider-required-note";
import { MissionPlanningClickHandler } from "./mission-planning-click-handler";
import { RecenterOnVehicleButton } from "./recenter-on-vehicle-button";
import { CameraFovOverlay } from "./camera-fov-overlay";
import { DEFAULT_FORWARD_ORIENTATION } from "@/lib/camera-providers";

const DEFAULT_LAYER_STATE: MapLayerState = {
  publicTransport: false,
  liveTraffic: false,
  bicycleRoutes: false,
  buildings3D: false,
  streetView: false,
  wildfires: false,
  airQuality: false,
  weatherZones: false,
  weatherMode: "temperature",
};

// One-time-per-mount warning if a base layer's tiles start failing (e.g. an
// ad-blocker or network policy blocks the provider's domain) — surfaced as a
// toast since LayersControl.BaseLayer requires a single plain TileLayer
// child, which rules out the richer inline fallback-banner treatment.
function tileErrorToast(providerName: string) {
  let warned = false;
  return () => {
    if (warned) return;
    warned = true;
    toast.warning(`${providerName} tiles unavailable`, {
      description: "This is often an ad-blocker, privacy extension, or network policy blocking the tile provider.",
    });
  };
}

function droneIcon(headingDeg: number, stale = false) {
  const color = stale ? "#94A3B8" : "#2563EB";
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${headingDeg}deg); width:26px; height:26px; display:flex; align-items:center; justify-content:center; opacity:${stale ? 0.6 : 1};">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${color}" fill-opacity="0.18"/>
        <path d="M12 3L17 16H7L12 3Z" fill="${color}" stroke="white" stroke-width="1.2"/>
      </svg>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function waypointIcon(status: "completed" | "active" | "pending") {
  const color = status === "completed" ? "#10B981" : status === "active" ? "#2563EB" : "#94A3B8";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function draftPointIcon(kind: "origin" | "waypoint" | "destination", index?: number) {
  const color = kind === "origin" ? "#10B981" : kind === "destination" ? "#EF4444" : "#2563EB";
  const label = kind === "origin" ? "O" : kind === "destination" ? "D" : String(index ?? "");
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font:600 11px sans-serif;color:white;">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function MissionMap() {
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_LAYER_STATE);
  const [streetViewPoint, setStreetViewPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showFovCone, setShowFovCone] = useState(true);

  const { data: legacyWaypoints } = useWaypoints();
  const { data: geofences } = useGeofences();
  const { telemetry, connected, mode, isStale, backendError } = useLiveTelemetry();

  const draftPoints = useMissionStore((s) => s.points);
  const planningMode = useMissionStore((s) => s.planningMode);

  const draftOrigin = draftPoints.find((p) => p.kind === "origin");
  const draftDestination = draftPoints.find((p) => p.kind === "destination");
  const draftWaypoints = draftPoints.filter((p) => p.kind === "waypoint");
  const hasDraftMission = draftPoints.length > 0;

  // The draft mission (real, operator-authored) takes over the map once it
  // has any points; otherwise fall back to the legacy demo path so the map
  // isn't empty on first load. See HANDOFF_STEP_03.md "mission upload flow".
  const draftPathLine = useMemo<[number, number][]>(() => {
    const ordered = [draftOrigin, ...draftWaypoints, draftDestination].filter(
      (p): p is NonNullable<typeof p> => Boolean(p)
    );
    return ordered.map((p) => [p.lat, p.lng]);
  }, [draftOrigin, draftWaypoints, draftDestination]);

  const legacyPathLine = useMemo<[number, number][]>(
    () => (legacyWaypoints ?? []).map((w) => [w.lat, w.lng]),
    [legacyWaypoints]
  );

  const gpsHasFix = Boolean(telemetry && telemetry.gps.satellites > 0);
  const uavPos: [number, number] | null = telemetry && gpsHasFix ? [telemetry.gps.latitude, telemetry.gps.longitude] : null;
  const markerStale = isStale || !connected;

  const toggleLayer = (key: keyof Omit<MapLayerState, "weatherMode">) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const setWeatherMode = (mode: WeatherLayerMode) => setLayers((prev) => ({ ...prev, weatherMode: mode }));

  // Surface a single "connect a provider" hint at a time, prioritizing whichever
  // unconfigured layer the operator most recently enabled.
  const missingProviderNote = layers.liveTraffic && !providers.tomtom.configured
    ? { envVar: "VITE_TOMTOM_API_KEY", provider: "TomTom Traffic" }
    : layers.publicTransport && !providers.thunderforest.configured
    ? { envVar: "VITE_THUNDERFOREST_API_KEY", provider: "Thunderforest Transit" }
    : layers.bicycleRoutes && !providers.thunderforest.configured
    ? { envVar: "VITE_THUNDERFOREST_API_KEY", provider: "Thunderforest Cycle Map" }
    : layers.streetView && !providers.google.configured
    ? { envVar: "VITE_GOOGLE_MAPS_API_KEY", provider: "Google Street View" }
    : layers.buildings3D && !providers.mapbox.configured
    ? { envVar: "VITE_MAPBOX_TOKEN", provider: "Mapbox GL (full 3D buildings)" }
    : null;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="absolute left-0 right-0 top-0 z-[500] flex-row items-start justify-between border-b-0 bg-gradient-to-b from-card/95 to-transparent pb-8">
        <div>
          <CardTitle>Mission Map</CardTitle>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            Live flight path &middot; waypoints &middot; geofence
            {planningMode !== "none" && (
              <Badge variant="primary" className="gap-1">
                <MapPin className="size-3" />
                Click map to set {planningMode}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={showFovCone ? "default" : "secondary"}
            size="sm"
            className={cn("gap-1.5", !showFovCone && "bg-surface/90 backdrop-blur")}
            onClick={() => setShowFovCone((v) => !v)}
          >
            Camera FOV
          </Button>
          <LayersMenu state={layers} onToggle={toggleLayer} onWeatherModeChange={setWeatherMode} />

          <Button variant="secondary" size="icon" className="bg-surface/90 backdrop-blur" aria-label="Expand map">
            <Maximize2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <div className="relative h-[420px] w-full lg:h-[520px]" style={{ perspective: layers.buildings3D ? "1400px" : undefined }}>
        <div
          className={cn(
            "h-full w-full origin-bottom transition-transform duration-500 ease-out",
            layers.buildings3D && "[transform:rotateX(28deg)_scale(0.94)]"
          )}
        >
          <MapContainer
            center={MISSION_CENTER}
            zoom={13}
            scrollWheelZoom
            zoomControl={false}
            className={cn("h-full w-full", layers.streetView && "cursor-crosshair")}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name={streetMapProvider.name}>
                <TileLayer
                  url={streetMapProvider.url}
                  attribution={streetMapProvider.attribution}
                  eventHandlers={{ tileerror: tileErrorToast(streetMapProvider.name) }}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name={satelliteMapProvider.name}>
                <TileLayer
                  url={satelliteMapProvider.url}
                  attribution={satelliteMapProvider.attribution}
                  eventHandlers={{ tileerror: tileErrorToast(satelliteMapProvider.name) }}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name={terrainMapProvider.name}>
                <TileLayer
                  url={terrainMapProvider.url}
                  attribution={terrainMapProvider.attribution}
                  eventHandlers={{ tileerror: tileErrorToast(terrainMapProvider.name) }}
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <ZoomControl position="bottomright" />
            <RecenterOnVehicleButton position={uavPos} />

            {/* GIS overlay layers — rendered below mission-critical elements so
                waypoints, flight path, geofences, and the UAV marker stay legible. */}
            {layers.weatherZones && <WeatherOverlayLayer mode={layers.weatherMode} />}
            {layers.liveTraffic && <TrafficOverlayLayer />}
            {layers.publicTransport && <TransitOverlayLayer />}
            {layers.bicycleRoutes && <BicycleOverlayLayer />}
            {layers.airQuality && <AirQualityOverlayLayer />}
            {layers.wildfires && <WildfireOverlayLayer />}
            <StreetViewClickHandler active={layers.streetView} onPick={setStreetViewPoint} />
            <MissionPlanningClickHandler />

            {geofences?.map((zone) => (
              <Polygon
                key={zone.id}
                positions={zone.coordinates}
                pathOptions={{
                  color: zone.type === "restricted" ? "#EF4444" : "#2563EB",
                  weight: zone.type === "restricted" ? 1.5 : 1.5,
                  fillOpacity: zone.type === "restricted" ? 0.08 : 0.04,
                  dashArray: zone.type === "restricted" ? "4 4" : undefined,
                }}
              >
                <Tooltip sticky>{zone.label}</Tooltip>
              </Polygon>
            ))}

            {hasDraftMission ? (
              <>
                <Polyline positions={draftPathLine} pathOptions={{ color: "#2563EB", weight: 2.5, opacity: 0.85, dashArray: "6 4" }} />
                {draftOrigin && (
                  <Marker position={[draftOrigin.lat, draftOrigin.lng]} icon={draftPointIcon("origin")}>
                    <Tooltip direction="top" offset={[0, -10]}>
                      <div className="text-xs">
                        <p className="font-medium">Mission Origin</p>
                        <p className="text-muted-foreground">
                          {draftOrigin.lat.toFixed(5)}, {draftOrigin.lng.toFixed(5)}
                        </p>
                      </div>
                    </Tooltip>
                  </Marker>
                )}
                {draftWaypoints.map((wp, i) => (
                  <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={draftPointIcon("waypoint", i + 1)}>
                    <Tooltip direction="top" offset={[0, -10]}>
                      <div className="text-xs">
                        <p className="font-medium">Waypoint {i + 1}</p>
                        <p className="text-muted-foreground">
                          Alt {wp.alt}m &middot; {wp.speed} m/s
                        </p>
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
                {draftDestination && (
                  <Marker position={[draftDestination.lat, draftDestination.lng]} icon={draftPointIcon("destination")}>
                    <Tooltip direction="top" offset={[0, -10]}>
                      <div className="text-xs">
                        <p className="font-medium">Mission Destination</p>
                        <p className="text-muted-foreground">
                          {draftDestination.lat.toFixed(5)}, {draftDestination.lng.toFixed(5)}
                        </p>
                      </div>
                    </Tooltip>
                  </Marker>
                )}
              </>
            ) : (
              <>
                <Polyline positions={legacyPathLine} pathOptions={{ color: "#2563EB", weight: 2.5, opacity: 0.8 }} />
                {legacyWaypoints?.map((wp) => (
                  <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon(wp.status)}>
                    <Tooltip direction="top" offset={[0, -8]}>
                      <div className="text-xs">
                        <p className="font-medium">{wp.label}</p>
                        <p className="text-muted-foreground">Alt {wp.altitudeM}m &middot; {wp.status} &middot; demo path</p>
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
              </>
            )}

            {uavPos && telemetry && (
              <CameraFovOverlay
                lat={uavPos[0]}
                lng={uavPos[1]}
                altitudeM={telemetry.gps.altitude}
                vehicleHeadingDeg={telemetry.heading_deg}
                orientation={DEFAULT_FORWARD_ORIENTATION}
                showCone={showFovCone}
                stale={markerStale}
              />
            )}

            {uavPos && telemetry && (
              <Marker position={uavPos} icon={droneIcon(telemetry.heading_deg, markerStale)}>
                <Tooltip direction="top" offset={[0, -14]}>
                  <div className="text-xs">
                    <p className="font-medium">
                      UAV {mode === "live" ? "· LIVE" : mode === "simulation" ? "· SIMULATION" : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {telemetry.gps.altitude.toFixed(0)}m AGL &middot; {telemetry.velocity_ms.toFixed(1)} m/s &middot; hdg {telemetry.heading_deg.toFixed(0)}°
                    </p>
                    {markerStale && <p className="text-warning">Stale position — last known location shown</p>}
                  </div>
                </Tooltip>
              </Marker>
            )}
          </MapContainer>
        </div>

        {layers.buildings3D && (
          <Badge variant="outline" className="absolute right-3 top-16 z-[500] gap-1 bg-surface/90 backdrop-blur">
            <Box className="size-3" />
            3D Preview{providers.mapbox.configured ? " · Mapbox ready" : ""}
          </Badge>
        )}
        {layers.streetView && !streetViewPoint && (
          <Badge variant="primary" className="absolute left-3 top-16 z-[500] bg-surface/90 backdrop-blur">
            Click the map to enter Street View
          </Badge>
        )}

        {missingProviderNote && <ProviderRequiredNote {...missingProviderNote} />}

        {backendError && (
          <Badge variant="destructive" className="absolute left-3 top-16 z-[500] gap-1 bg-surface/90 backdrop-blur">
            Backend unreachable — vehicle position unknown
          </Badge>
        )}
      </div>

      <StreetViewModal point={streetViewPoint} onClose={() => setStreetViewPoint(null)} />

      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-surface py-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Drone</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-warning" style={{ borderTop: "1.5px dashed #F59E0B", background: "transparent" }} /> Camera direction / FOV</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Active leg</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-destructive" /> Restricted zone</span>
        <Badge variant="outline" className="ml-auto">
          {hasDraftMission
            ? `${draftPoints.length} mission point${draftPoints.length === 1 ? "" : "s"} planned`
            : `${legacyWaypoints?.filter((w) => w.status === "completed").length ?? 0}/${legacyWaypoints ? legacyWaypoints.length - 1 : 0} waypoints (demo)`}
        </Badge>
      </CardContent>
    </Card>
  );
}
