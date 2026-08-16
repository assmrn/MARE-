import asyncio
import random

from api.vision import analyze_frame
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from reasoning.risk import evaluate_detection_severity

app = FastAPI()
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/telemetry")
async def telemetry():
    return {
        "gps": None,
        "battery": None,
        "status": "Planned"
    }
@app.websocket("/api/ws/detections")
async def websocket_detections(websocket: WebSocket):
    await websocket.accept()
    frame_id = 0
    mission_context = "Coastal Survey"
    
    try:
        while True:
            # Note: In Step 7, this base64 string will be dynamically captured from RTSP
            dummy_base64_frame = "" # Provide a valid base64 test string here if testing real API
            
            # 1. Run AI Perception
            detections = analyze_frame(dummy_base64_frame, frame_id, mission_context)
            
            # 2. Simulated Fallback (if API key is missing/dummy)
            if not detections:
                detections = [{
                    "detection_id": f"sim_{frame_id}",
                    "class_name": random.choice(["Vessel", "Debris", "Heat Signature"]),
                    "confidence": round(random.uniform(0.70, 0.98), 2),
                    "bounding_box": {"x": random.randint(10, 80), "y": random.randint(10, 80), "w": 15, "h": 15},
                    "timestamp": "2026-08-16T17:17:28Z",
                    "camera_id": "cam_main",
                    "frame_id": frame_id,
                    "latitude_estimate": None,
                    "longitude_estimate": None,
                    "mission_context": mission_context,
                    "severity": "Low"
                }]

            # 3. Apply MARE Reasoning
            processed_payload = []
            for det in detections:
                if isinstance(det, dict):
                    det["severity"] = evaluate_detection_severity(det["class_name"], det["confidence"], mission_context)
                    processed_payload.append(det)
                else:
                    det.severity = evaluate_detection_severity(det.class_name, det.confidence, mission_context)
                    processed_payload.append(det.model_dump())
                    
            await websocket.send_json(processed_payload)
            frame_id += 1
            await asyncio.sleep(1.0) # 1 FPS to avoid rate limits
            
    except WebSocketDisconnect:
        pass
