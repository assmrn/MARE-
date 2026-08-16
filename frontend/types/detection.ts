// mare-dashboard/src/types/detection.ts
export interface BoundingBox { x: number; y: number; w: number; h: number; }
export interface Detection {
  detection_id: string;
  class_name: string;
  confidence: number;
  bounding_box: BoundingBox;
  timestamp: string;
  camera_id: string;
  frame_id: number;
  latitude_estimate: number | null;
  longitude_estimate: number | null;
  mission_context: string;
  severity: "Low" | "Medium" | "High";
  simulated?: boolean;
}