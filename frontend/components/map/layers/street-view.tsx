import { useMapEvents } from "react-leaflet";
import { MapPin, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { providers } from "@/lib/map-providers";

interface ClickPoint {
  lat: number;
  lng: number;
}

/** Attaches a map click handler while Street View mode is active; renders no visible layer itself. */
export function StreetViewClickHandler({ active, onPick }: { active: boolean; onPick: (pt: ClickPoint) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function StreetViewModal({ point, onClose }: { point: ClickPoint | null; onClose: () => void }) {
  const live = providers.google.configured;

  return (
    <Dialog open={!!point} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Street View
          </DialogTitle>
          <DialogDescription>
            {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {live && point ? (
          <iframe
            title="Street View"
            className="aspect-video w-full rounded-lg border border-border"
            src={providers.google.streetViewEmbedUrl(point.lat, point.lng)}
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted text-center">
            <KeyRound className="size-6 text-warning" />
            <p className="max-w-[280px] text-xs text-muted-foreground">
              No Street View coverage available in simulation mode. Connect{" "}
              <code className="rounded bg-background px-1 py-0.5 font-mono text-[10px]">VITE_GOOGLE_MAPS_API_KEY</code> to enable live
              panoramic imagery.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
