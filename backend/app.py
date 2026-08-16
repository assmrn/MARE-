# mare-backend/app.py
import asyncio
import random
from datetime import datetime, timezone

from api.vision import analyze_frame
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from reasoning.risk import evaluate_detection_severity

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "px4_connected": False,
        "mode": "simulation",
    }


@app.get("/telemetry")
async def telemetry():
    return {
        "gps": {
            "satellites": random.randint(8, 16),
            "hdop": round(random.uniform(0.6, 1.2), 2),
            "fix_type": "3D",
            "latitude": None,
            "longitude": None,
        },
        "battery": {
            "percentage": round(random.uniform(60, 85), 1),
            "voltage": round(random.uniform(20.5, 22.5), 1),
            "minutes_remaining": random.randint(20, 35),
        },
        "altitude": round(random.uniform(120, 140), 1),
        "ground_speed": round(random.uniform(8, 12), 1),
        "heading": random.randint(0, 359),
        "armed": True,
        "flight_mode": "AUTO",
        "signal_strength": random.randint(75, 95),
        "mission_progress": random.randint(0, 100),
    }


@app.websocket("/api/ws/detections")
async def websocket_detections(websocket: WebSocket):
    await websocket.accept()
    frame_id = 0
    mission_context = "Coastal Survey"

    try:
        while True:
            dummy_base64_frame = ""

            detections = analyze_frame(dummy_base64_frame, frame_id, mission_context)

            if not detections:
                detections = [{
                    "detection_id": f"sim_{frame_id}",
                    "class_name": random.choice(["Vessel", "Debris", "Heat Signature"]),
                    "confidence": round(random.uniform(0.70, 0.98), 2),
                    "bounding_box": {"x": random.randint(10, 80), "y": random.randint(10, 80), "w": 15, "h": 15},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "camera_id": "cam_main",
                    "frame_id": frame_id,
                    "latitude_estimate": None,
                    "longitude_estimate": None,
                    "mission_context": mission_context,
                    "severity": "Low"
                }]

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
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        pass
