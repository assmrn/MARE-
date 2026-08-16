import { Circle, Tooltip } from "react-leaflet";
import { useAirQualityZones } from "@/hooks/useMissionData";
import { aqiColor } from "../layer-colors";

export function AirQualityOverlayLayer() {
  const { data: zones } = useAirQualityZones(true);

  return (
    <>
      {zones?.map((zone) => {
        const { color } = aqiColor(zone.aqi);
        return (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radiusM}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.22 }}
          >
            <Tooltip sticky>
              <div className="min-w-[160px] text-xs">
                <p className="font-semibold">
                  AQI {zone.aqi} · {zone.category}
                </p>
                <p className="mt-0.5 text-muted-foreground">Primary pollutant: {zone.primaryPollutant}</p>
                <p className="mt-1 leading-snug">{zone.healthAdvisory}</p>
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
