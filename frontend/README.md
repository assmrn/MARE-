# MARE — Mission Anomaly Reasoning Engine

A production-quality mission control dashboard for an autonomous drone platform, built for the Google Gemini × XPRIZE Developer Competition. Styled after NASA/SpaceX mission control, Palantir Foundry, and PX4 Ground Control — calm, information-dense, and engineering-grade.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview the production build
```

Requires Node 18+.

## What's included

- **Dashboard** — KPI grid (battery, altitude, speed, GPS, flight mode, signal, mission progress, weather risk), live mission map, AI Reasoning Engine panel, mission timeline, flight controls, alerts preview
- **Mission Planner** — map + editable waypoint sequence
- **Mission Map GIS layers** — base style switcher (Default Road Map / Satellite / Terrain) plus a **Layers** menu with independently toggleable overlays: Public Transport, Live Traffic, Bicycle Routes, 3D/Raised Buildings, Street View, Wildfires, Air Quality, and Weather Zones (Temperature / Rainfall / Wind / Cloud Cover). Mission-critical elements (waypoints, flight path, geofence, UAV position) always render on top of these layers. See **Map data providers** below.
- **Operator menu** — Operator Profile (view + inline edit), Certifications (license list with download/renew), and Sign Out (confirmation dialog → clears session → redirects to `/login`) are all fully functional
- **Telemetry** — battery, GPS, comms, motors/ESCs, mission progress, with live-updating charts
- **Camera Streams** — RGB / Thermal / Depth feed panels with simulated object-detection overlays
- **AI Copilot** — full-page chat + floating widget available on every screen, with mission-context sidebar
- **System Logs** — filterable, searchable event log
- **Weather** — current conditions, safe-to-fly indicator, 8-hour forecast chart
- **Mission Archive** — historical mission table
- **Settings** — appearance (light/dark/system), units, operator profile

## Connecting the real FastAPI / PX4 backend

Flight-critical functionality now talks to a real backend instead of mock data:

1. Set `VITE_API_URL` in `.env.local` (defaults to `http://127.0.0.1:8000` if unset).
2. Your FastAPI service needs these routes — see `src/services/api.ts` (`droneApi` Axios client) for the exact calls:
   - `GET /health` — backend + PX4 connection status
   - `GET /telemetry` — live telemetry snapshot (polled at 2Hz by `useLiveTelemetry` in `src/hooks/useMissionData.ts`)
   - `GET /reasoning` — triggers Gemini and returns a diagnostic report (wired to the "Run AI Diagnostic" button in `ai-reasoning-panel.tsx`)
   - `POST /connect`, `/arm`, `/disarm`, `/takeoff`, `/land`, `/hold`, `/rtl`, `/emergency_stop` — flight commands (wired to `flight-controls.tsx`, each with confirmation dialogs and try/catch error toasts)
3. Response shapes are typed in `src/types/mission.ts` (`HealthStatus`, `LiveTelemetry`, `ReasoningReport`, `CommandResponse`) — adjust field names there if your Pydantic models differ; everything downstream just consumes those types.
4. Dashboard sections with no corresponding endpoint yet (weather, cameras, alerts log, system logs, archive, operator profile, copilot chat) still run on mock data — see the clearly-marked "MOCK DATA" section in `src/services/api.ts`. Swap them the same way once those endpoints exist.

If the backend isn't running, flight commands and the AI diagnostic button fail gracefully with an error toast instead of crashing the UI — try it by leaving `VITE_API_URL` pointed at nothing and clicking Arm.

## Map data providers

The base map (Street View / Satellite View / Terrain View) uses react-leaflet's native `<LayersControl position="topright">` with three `<LayersControl.BaseLayer>` entries — see `src/lib/map-providers.ts` for the plain tile URLs (`streetMapProvider`, `satelliteMapProvider`, `terrainMapProvider`, no API key required) and `src/components/map/mission-map.tsx` for where they're wired in. Street View is checked by default.

The GIS overlay layers (weather, traffic, air quality, wildfires, etc., opened via the separate "Layers" button) work out of the box with a clearly-labeled **simulated** dataset — nothing breaks if you don't have API keys. To switch one to **live** data, copy `.env.example` to `.env.local`, add the relevant key, and restart the dev server:

| Layer | Provider | Env var |
|---|---|---|
| Weather (temp/rain/wind/clouds) | OpenWeatherMap | `VITE_OPENWEATHERMAP_API_KEY` |
| Public Transport, Bicycle Routes | Thunderforest | `VITE_THUNDERFOREST_API_KEY` |
| Live Traffic | TomTom | `VITE_TOMTOM_API_KEY` |
| 3D Buildings (full render) | Mapbox GL | `VITE_MAPBOX_TOKEN` |
| Street View | Google Maps Platform | `VITE_GOOGLE_MAPS_API_KEY` |
| Air Quality | (integration point ready) | `VITE_AIRQUALITY_API_KEY` |
| Wildfires | (integration point ready — NASA FIRMS) | `VITE_FIRMS_API_KEY` |

Provider config lives in `src/lib/map-providers.ts`. Each layer component in `src/components/map/layers/` checks `providers.<name>.configured` and renders either the real tile layer or a simulated one — no other code needs to change when you add a key. When a toggled-on layer has no key configured, a small "Connect X" note appears over the map telling you exactly which env var to set.

Note: full 3D building extrusion and true Street View panoramas require a vector-tile engine (Mapbox GL / Google Maps JS) rather than Leaflet's raster tiles. Without `VITE_MAPBOX_TOKEN`, the 3D Buildings toggle applies a CSS tilt preview so the interaction still feels real; without `VITE_GOOGLE_MAPS_API_KEY`, Street View shows a "no coverage in simulation mode" placeholder when you click the map instead of a broken embed.

### Base map tile errors

Each `<LayersControl.BaseLayer>`'s `TileLayer` has a `tileerror` handler (see `tileErrorToast` in `mission-map.tsx`) that shows a one-time toast if a provider's tiles fail to load — this matters because free tile CDNs are occasionally blocked by ad-blockers, privacy extensions, or corporate network policies. Mission data (waypoints, telemetry, AI reasoning) doesn't depend on tile imagery either way.

## Architecture

```
src/
  components/
    ui/          shadcn-style primitives (Button, Card, Dialog, Table, etc.)
    layout/       Sidebar, Topbar, mobile nav, app shell, operator profile /
                   certifications / sign-out dialogs
    dashboard/    KPI grid, AI reasoning panel, timeline, flight controls
    map/          Mission map (React Leaflet), layers menu, layer-colors,
                   layers/  (weather, air quality, wildfire, traffic,
                             transit, bicycle, street view overlays)
    alerts/       Alerts table
    copilot/      Floating AI Copilot widget
  pages/          One file per route (incl. login.tsx)
  hooks/          TanStack Query hooks (polling intervals live here)
  store/
    authStore.ts  Zustand session state for the sign-out → /login flow
  services/
    api.ts        The seam between UI and data — every function has a TODO
                   marking the real endpoint/websocket call that replaces it
    mockData.ts   Deterministic mock generators standing in for a live backend
  types/
    mission.ts    Domain types — the contract a real API should satisfy
  lib/
    theme-provider.tsx   Light/Dark/System theme context
    map-providers.ts     Third-party GIS/weather provider config + key gating
    utils.ts             cn(), formatters
```

## Wiring up a real backend

The app is deliberately structured so this is a data-layer swap, not a rewrite:

1. **`src/services/api.ts`** — replace each function body with a real `fetch()` call to your PX4/telemetry bridge. Set `VITE_API_BASE_URL` in a `.env` file. Return types must keep matching `src/types/mission.ts`; components never import from `mockData.ts` directly.
2. **Streaming telemetry** — `useTelemetrySnapshot()` in `src/hooks/useMissionData.ts` currently polls every 2s via TanStack Query. Swap the `queryFn` for a WebSocket subscription (e.g. push into the query cache with `queryClient.setQueryData`) without touching any component.
3. **AI Copilot** — `sendCopilotMessage()` in `api.ts` is where you'd route to Gemini with mission telemetry + the AI reasoning log injected as context.
4. **Flight commands** — `sendFlightCommand()` posts ARM/DISARM/TAKEOFF/LAND/RTL/HOLD/EMERGENCY_STOP; wire this to your flight controller's command endpoint.
5. **Map data** — waypoints/geofences come from `fetchWaypoints()` / `fetchGeofences()`; point these at your mission planner's stored routes.

## Design tokens

Colors, spacing, and radii live as CSS variables in `src/index.css` (light + `.dark` blocks) and are exposed through `tailwind.config.js`. Primary blue `#2563EB`, success green `#10B981`, warning amber `#F59E0B`, destructive red `#EF4444`, on slate neutrals — matching the brief's engineering-inspired palette exactly.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · Radix UI primitives (shadcn-style) · TanStack Query · Recharts · React Leaflet · React Router · Lucide Icons · Framer-Motion-ready animation utilities · sonner (toasts)
