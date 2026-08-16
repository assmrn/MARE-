import json
import uuid
from datetime import datetime
from typing import Optional

from google import genai
from google.genai import types
from pydantic import BaseModel


# 1. Define the Structured Output Models (Matches your Step 6 requirements)
class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float

class Detection(BaseModel):
    detection_id: str
    class_name: str
    confidence: float
    bounding_box: BoundingBox
    timestamp: str
    camera_id: str
    frame_id: int
    location_estimate: dict | None = None
    mission_context: str
    severity: str = "Low" # Default, updated by reasoning layer later

# Initialize the Gemini Client
# It will automatically pick up the GEMINI_API_KEY from your environment variables
client = genai.Client()

async def analyze_frame_with_ai(base64_image: str, frame_id: int, mission_context: str) -> List[Detection]:
    """
    Sends a frame to Gemini 1.5 Flash to detect anomalies based on the mission context.
    """
    prompt = f"""
    Analyze this camera frame for a {mission_context} mission.
    Identify any vessels, debris, heat signatures, or anomalies.
    For each object, provide:
    - class_name (e.g., Vessel, Debris, Heat Signature)
    - confidence (0.0 to 1.0)
    - bounding_box (x, y, w, h) as percentages of the image (0-100)
    """
    
    try:
        # We use the structured outputs feature to guarantee perfect JSON!
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt, {"mime_type": "image/jpeg", "data": base64_image}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[Detection],
                temperature=0.2 # Low temperature for more deterministic, factual detections
            ),
        )
        
        # Parse the JSON string back into our Python dictionaries
        raw_detections = json.loads(response.text)
        
        detections = []
        for det in raw_detections:
            # Inject the system-level fields that the AI model shouldn't guess
            det['detection_id'] = f"det_{uuid.uuid4().hex[:6]}"
            det['timestamp'] = datetime.utcnow().isoformat() + "Z"  # noqa: DTZ003
            det['camera_id'] = "cam_front_rgb"
            det['frame_id'] = frame_id
            det['mission_context'] = mission_context
            det['location_estimate'] = None # Enforcing the geographical limitation constraint
            
            # Validate and append
            detections.append(Detection(**det))
            
        return detections
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"AI Vision Error: {e}")
        return []