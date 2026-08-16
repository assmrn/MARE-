import { TileLayer } from "react-leaflet";
import { providers } from "@/lib/map-providers";

export function BicycleOverlayLayer() {
  if (!providers.thunderforest.configured) return null;
  return <TileLayer url={providers.thunderforest.tileUrl("cycle")} opacity={0.85} zIndex={413} />;
}
