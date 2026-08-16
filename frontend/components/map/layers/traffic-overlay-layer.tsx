import { TileLayer, Polyline, Tooltip } from "react-leaflet";
import { providers } from "@/lib/map-providers";
import { trafficColor, type TrafficLevel } from "../layer-colors";

const SIMULATED_SEGMENTS: { id: string; level: TrafficLevel; points: [number, number][] }[] = [
  { id: "seg-1", level: "free", points: [[37.452, -122.44], [37.462, -122.43], [37.472, -122.418]] },
  { id: "seg-2", level: "moderate", points: [[37.472, -122.418], [37.482, -122.404], [37.49, -122.392]] },
  { id: "seg-3", level: "heavy", points: [[37.458, -122.45], [37.466, -122.445], [37.474, -122.438]] },
  { id: "seg-4", level: "severe", points: [[37.495, -122.4], [37.5, -122.39]] },
];

export function TrafficOverlayLayer() {
  const live = providers.tomtom.configured;

  if (live) {
    return <TileLayer url={providers.tomtom.tileUrl()} opacity={0.7} zIndex={415} />;
  }

  return (
    <>
      {SIMULATED_SEGMENTS.map((seg) => (
        <Polyline key={seg.id} positions={seg.points} pathOptions={{ color: trafficColor(seg.level), weight: 5, opacity: 0.85, lineCap: "round" }}>
          <Tooltip sticky className="capitalize">
            {seg.level} traffic
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}
