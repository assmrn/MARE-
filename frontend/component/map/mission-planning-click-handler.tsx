import { useMapEvents } from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";

/** Renders nothing — attaches a click handler to the map while a planning mode is active. */
export function MissionPlanningClickHandler() {
  const planningMode = useMissionStore((s) => s.planningMode);
  const placePoint = useMissionStore((s) => s.placePoint);

  useMapEvents({
    click(e) {
      if (planningMode === "none") return;
      placePoint(planningMode, e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}
