import { Fragment } from "react";
import { Polygon, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useWildfireZones } from "@/hooks/useMissionData";
import { wildfireColor } from "../layer-colors";

function smokeIcon(deg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${deg}deg);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 12h13M17 12l-4-4M17 12l-4 4" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      </svg>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function polygonCenter(coords: [number, number][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

export function WildfireOverlayLayer() {
  const { data: zones } = useWildfireZones(true);

  return (
    <>
      {zones?.map((zone) => {
        const color = wildfireColor(zone.risk);
        const center = polygonCenter(zone.coordinates);
        return (
          <Fragment key={zone.id}>
            <Polygon positions={zone.coordinates} pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.22 }}>
              <Tooltip sticky>
                <div className="text-xs">
                  <p className="font-semibold capitalize">{zone.risk} risk</p>
                  <p className="text-muted-foreground">{zone.label}</p>
                </div>
              </Tooltip>
            </Polygon>
            {zone.risk === "active" && zone.smokeDirectionDeg !== undefined && (
              <Marker position={center} icon={smokeIcon(zone.smokeDirectionDeg)}>
                <Tooltip>Smoke drift {zone.smokeDirectionDeg}°</Tooltip>
              </Marker>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
