import { useMemo } from "react";
import { TileLayer, Rectangle, Circle, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { providers } from "@/lib/map-providers";
import { MISSION_CENTER } from "@/services/mockData";
import { temperatureColor, seededValue } from "../layer-colors";
import type { WeatherLayerMode } from "@/types/mission";

const OWM_LAYER_KEY: Record<WeatherLayerMode, "temp_new" | "precipitation_new" | "wind_new" | "clouds_new"> = {
  temperature: "temp_new",
  rainfall: "precipitation_new",
  wind: "wind_new",
  clouds: "clouds_new",
};

function windArrowIcon(deg: number, speedKph: number) {
  const scale = Math.min(1.4, 0.7 + speedKph / 40);
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${deg}deg) scale(${scale}); transform-origin: center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L12 20M12 2L6 8M12 2L18 8" stroke="#F59E0B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Builds a small grid of cells around the mission center for simulated visualizations. */
function useGrid(rows: number, cols: number, spanDeg: number) {
  return useMemo(() => {
    const [clat, clng] = MISSION_CENTER;
    const cells: { id: string; bounds: [[number, number], [number, number]]; center: [number, number] }[] = [];
    const stepLat = spanDeg / rows;
    const stepLng = spanDeg / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lat0 = clat - spanDeg / 2 + r * stepLat;
        const lng0 = clng - spanDeg / 2 + c * stepLng;
        cells.push({
          id: `${r}-${c}`,
          bounds: [
            [lat0, lng0],
            [lat0 + stepLat, lng0 + stepLng],
          ],
          center: [lat0 + stepLat / 2, lng0 + stepLng / 2],
        });
      }
    }
    return cells;
  }, [rows, cols, spanDeg]);
}

export function WeatherOverlayLayer({ mode }: { mode: WeatherLayerMode }) {
  const live = providers.openWeather.configured;
  const grid = useGrid(5, 5, 0.09);

  if (live) {
    return <TileLayer url={providers.openWeather.tileUrl(OWM_LAYER_KEY[mode])} opacity={0.55} zIndex={410} />;
  }

  if (mode === "temperature") {
    return (
      <>
        {grid.map((cell) => {
          const temp = seededValue(`temp-${cell.id}`, 8, 34);
          return (
            <Rectangle
              key={cell.id}
              bounds={cell.bounds}
              pathOptions={{ color: "transparent", fillColor: temperatureColor(temp), fillOpacity: 0.28, weight: 0 }}
            >
              <Tooltip sticky>{temp.toFixed(0)}°C</Tooltip>
            </Rectangle>
          );
        })}
      </>
    );
  }

  if (mode === "clouds") {
    return (
      <>
        {grid
          .filter((_, i) => i % 2 === 0)
          .map((cell) => {
            const coverage = seededValue(`cloud-${cell.id}`, 0.1, 0.5);
            return (
              <Circle
                key={cell.id}
                center={cell.center}
                radius={900}
                pathOptions={{ color: "transparent", fillColor: "#CBD5E1", fillOpacity: coverage, weight: 0 }}
              />
            );
          })}
      </>
    );
  }

  if (mode === "rainfall") {
    const [clat, clng] = MISSION_CENTER;
    return (
      <>
        {[1800, 1200, 700].map((radius, i) => (
          <Circle
            key={radius}
            center={[clat + 0.01, clng + 0.015]}
            radius={radius}
            pathOptions={{ color: "#2563EB", weight: 1, fillColor: "#2563EB", fillOpacity: 0.12 + i * 0.06, dashArray: "3 5" }}
          >
            <Tooltip sticky>Radar-style precipitation cell</Tooltip>
          </Circle>
        ))}
      </>
    );
  }

  // wind
  return (
    <>
      {grid.map((cell) => {
        const deg = seededValue(`wind-deg-${cell.id}`, 200, 280);
        const speed = seededValue(`wind-speed-${cell.id}`, 8, 26);
        return (
          <Marker key={cell.id} position={cell.center} icon={windArrowIcon(deg, speed)}>
            <Tooltip>{`${speed.toFixed(0)} km/h @ ${deg.toFixed(0)}°`}</Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
