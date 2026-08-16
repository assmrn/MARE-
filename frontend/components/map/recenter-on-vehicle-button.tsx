import { useMap } from "react-leaflet";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * MapContainer's `center` prop only applies on first mount (react-leaflet /
 * Leaflet limitation — see HANDOFF_STEP_01.md §4). This button is the
 * explicit, user-triggered escape hatch: it imperatively calls flyTo with
 * the vehicle's current real position rather than relying on a prop that
 * silently stops working after mount.
 */
export function RecenterOnVehicleButton({ position, disabled }: { position: [number, number] | null; disabled?: boolean }) {
  const map = useMap();

  return (
    <div className="absolute bottom-3 left-3 z-[500]">
      <Button
        variant="secondary"
        size="icon"
        className="bg-surface/90 shadow-elevated backdrop-blur"
        aria-label="Center map on vehicle"
        disabled={disabled || !position}
        onClick={() => position && map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.8 })}
      >
        <LocateFixed className="size-3.5" />
      </Button>
    </div>
  );
}
