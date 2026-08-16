import { TileLayer } from "react-leaflet";
import { providers } from "@/lib/map-providers";

export function TransitOverlayLayer() {
  if (!providers.thunderforest.configured) return null;
  return <TileLayer url={providers.thunderforest.tileUrl("transport")} opacity={0.85} zIndex={412} />;
}
