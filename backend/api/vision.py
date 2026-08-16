# mare-backend/api/vision.py
import os
import uuid
from datetime import datetime

from google import genai
from google.genai import types
from pydantic import BaseModel


class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float

class DetectionResult(BaseModel):
    detection_id: str
    class_name: str
    confidence: float
    bounding_box: BoundingBox
    timestamp: str
    camera_id: str
    frame_id: int
    latitude_estimate: float | None = None
    longitude_estimate: float | None = None
    mission_context: str
    severity: str = "Low"

def analyze_frame(base64_image: str, frame_id: int, mission_context: str) -> list[DetectionResult]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "dummy-key-for-import-only":
        return [] # Fallback handled in WebSocket

    client = genai.Client(api_key=api_key)
    prompt = f"Analyze this camera frame for a {mission_context} mission. Identify vessels, debris, or anomalies. Return bounding boxes (x, y, w, h as percentages 0-100), class_name, and confidence (0.0-1.0)."
    
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt, {"mime_type": "image/jpeg", "data": base64_image}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[DetectionResult],
                temperature=0.2
            ),
        )
        import json
        raw_detections = json.loads(response.text)
        
        results = []
        for det in raw_detections:
            det['detection_id'] = f"det_{uuid.uuid4().hex[:8]}"
            det['timestamp'] = f"{datetime.utcnow().isoformat()}Z"  # noqa: DTZ003
            det['camera_id'] = "cam_main"
            det['frame_id'] = frame_id
            det['mission_context'] = mission_context
            # Enforcing Step 6 Rule: Do not invent coordinates
            det['latitude_estimate'] = None 
            det['longitude_estimate'] = None
            results.append(DetectionResult(**det))
        return results
    except (ValueError, KeyError, AttributeError) as e:
        print(f"Vision API Error: {e}")
        return []
