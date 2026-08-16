// mare-dashboard/src/components/camera/camera-detection-overlay.tsx
import { useEffect, useState } from "react";
import type { Detection } from "@/types/detection";

export function CameraDetectionOverlay(): JSX.Element {
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/api/ws/detections");
    ws.onmessage = (event) => setDetections(JSON.parse(event.data));
    return () => ws.close();
  }, []);

  const getColor = (severity: string) => {
    if (severity === "High") return "border-red-500 bg-red-500/20 text-red-100";
    if (severity === "Medium") return "border-amber-400 bg-amber-400/20 text-amber-100";
    return "border-emerald-400 bg-emerald-400/20 text-emerald-100";
  };

  const getBgColor = (severity: string) => {
    const color = getColor(severity);
    return color.split(' ')[0].replace('border-', 'bg-');
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 h-full w-full">
      {detections.map((det) => {
        const colors = getColor(det.severity).split(' ');
        return (
          <div
            key={det.detection_id}
            className={`absolute border-2 shadow-sm transition-all duration-300 ${colors[0]} ${colors[1]}`}
            style={{
              left: `${det.bounding_box.x}%`,
              top: `${det.bounding_box.y}%`,
              width: `${det.bounding_box.w}%`,
              height: `${det.bounding_box.h}%`,
            }}
          >
            <div className={`absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold ${getBgColor(det.severity)} text-black`}>
              {det.class_name} {(det.confidence * 100).toFixed(0)}% | {det.severity}
            </div>
          </div>
        );
      })}
    </div>
  );
}