import asyncio
import logging
import random
import time
import uuid

from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketDisconnect

log = logging.getLogger(__name__)
app = FastAPI()

# Placeholder extractor module
class Extractor:
    @staticmethod
    def battery_features(battery):
        return {}
    
    @staticmethod
    def motor_features(motor):
        return {}

extractor = Extractor()

# Global store for the latest visual targets
latest_detections = []

@app.websocket("/api/ws/detections")
async def websocket_detections(websocket: WebSocket):
    """Streams live camera AI detections (simulated for UI architecture testing)."""
    global latest_detections
    await websocket.accept()
    try:
        while True:
            # Generate a structured simulated detection
            detection = {
                "detection_id": str(uuid.uuid4())[:8],
                "class_name": random.choice(["Vessel", "Debris", "Heat Signature"]),
                "confidence": round(random.uniform(0.70, 0.98), 2),
                "bounding_box": {
                    # Percentages relative to video frame size (x, y, width, height)
                    "x": round(random.uniform(10, 60), 1),
                    "y": round(random.uniform(10, 60), 1),
                    "w": round(random.uniform(10, 25), 1),
                    "h": round(random.uniform(10, 25), 1)
                },
                "timestamp": time.time(),
                "simulated": True
            }
            
            # Occasionally send an empty array to simulate targets entering/leaving frame
            payload = [detection] if random.random() > 0.3 else []
            latest_detections = payload
            
            await websocket.send_json(payload)
            await asyncio.sleep(2.0) # Update detections every 2 seconds
    except WebSocketDisconnect:
        log.info("Client disconnected from detections websocket")

def _get_telemetry():
    """Fetch telemetry data (placeholder implementation)."""

def analyze_telemetry(features: str, visual_detections: list):
    """Analyze telemetry data with visual detections (placeholder implementation)."""
    return "Analysis complete"

@app.get("/reasoning")
async def reasoning():
    telem = _get_telemetry()
    features: dict = {}
    if telem:
        features.update(extractor.battery_features(telem.battery) if hasattr(extractor, 'battery_features') else {})
        if telem.motors:
            features.update(extractor.motor_features(telem.motors[0]) if hasattr(extractor, 'motor_features') else {})
        else:
            features.update({
                "motor_rpm_low": False,
                "motor_current_high": False,
                "motor_temperature_high": False,
            })
    else:
        features.update({
            "motor_rpm_low": False,
            "motor_current_high": False,
            "motor_temperature_high": False,
        })
        
    # Pass BOTH telemetry and the live camera detections to the MARE engine
    ai_report = analyze_telemetry(str(features), visual_detections=latest_detections)
    return {"diagnostic_report": ai_report}
