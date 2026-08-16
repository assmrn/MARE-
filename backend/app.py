# mare-backend/app.py
import asyncio
import random
from datetime import datetime, timezone

from api.vision import analyze_frame
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mavsdk import System
from reasoning.risk import evaluate_detection_severity

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

drone = System()
_connected = False
_last_position = None
_last_battery = None
_last_armed = False
_last_flight_mode = "UNKNOWN"


@app.on_event("startup")
async def startup():
    asyncio.create_task(_connect_and_stream())


async def _connect_and_stream():
    global _connected
    await drone.connect(system_address="udp://:14540")

    async for state in drone.core.connection_state():
        _connected = state.is_connected
        if _connected:
            break

    asyncio.create_task(_stream_position())
    asyncio.create_task(_stream_battery())
    asyncio.create_task(_stream_flight_mode())
    asyncio.create_task(_stream_armed())


async def _stream_position():
    global _last_position
    async for position in drone.telemetry.position():
        _last_position = position


async def _stream_battery():
    global _last_battery
    async for battery in drone.telemetry.battery():
        _last_battery = battery


async def _stream_flight_mode():
    global _last_flight_mode
    async for mode in drone.telemetry.flight_mode():
        _last_flight_mode = str(mode)


async def _stream_armed():
    global _last_armed
    async for armed in drone.telemetry.armed():
        _last_armed = armed


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "px4_connected": _connected,
        "mode": "live" if _connected else "simulation",
    }


@app.get("/telemetry")
async def telemetry():
    if not _connected or _last_position is None or _last_battery is None:
        return {
            "gps": {"satellites": 0, "hdop": 99.9, "fix_type": "NO_FIX",
                     "latitude": 37.4636, "longitude": -122.4286, "altitude": 0.0},
            "battery": {"percentage": 0.0, "voltage": 0.0, "minutes_remaining": 0},
            "heading_deg": 0,
            "velocity_ms": 0.0,
            "armed": _last_armed,
            "flight_mode": _last_flight_mode,
            "signal_strength": 0,
            "mission_progress": 0,
        }

    return {
        "gps": {
            "satellites": 12,
            "hdop": 0.8,
            "fix_type": "3D",
            "latitude": _last_position.latitude_deg,
            "longitude": _last_position.longitude_deg,
            "altitude": _last_position.relative_altitude_m,
        },
        "battery": {
            "percentage": round(_last_battery.remaining_percent * 100, 1),
            "voltage": round(_last_battery.voltage_v, 1),
            "minutes_remaining": 0,
        },
        "heading_deg": 0,
        "velocity_ms": 0.0,
        "armed": _last_armed,
        "flight_mode": _last_flight_mode,
        "signal_strength": 100 if _connected else 0,
        "mission_progress": 0,
    }


class GotoRequest(BaseModel):
    latitude: float
    longitude: float
    altitude_m: float = 20.0


class TakeoffRequest(BaseModel):
    altitude_m: float = 10.0


def _require_connected():
    if not _connected:
        raise HTTPException(status_code=503, detail="PX4 not connected")


@app.post("/connect")
async def connect_endpoint():
    return {"success": _connected, "status": "ok" if _connected else "pending", "message": "connected" if _connected else "not yet connected"}


@app.post("/arm")
async def arm():
    _require_connected()
    try:
        await drone.action.arm()
        return {"success": True, "status": "ok", "message": "armed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/disarm")
async def disarm():
    _require_connected()
    try:
        await drone.action.disarm()
        return {"success": True, "status": "ok", "message": "disarmed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/takeoff")
async def takeoff(req: TakeoffRequest = TakeoffRequest()):
    _require_connected()
    try:
        await drone.action.set_takeoff_altitude(req.altitude_m)
        await drone.action.arm()
        await drone.action.takeoff()
        return {"success": True, "status": "ok", "message": f"taking off to {req.altitude_m}m"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/land")
async def land():
    _require_connected()
    try:
        await drone.action.land()
        return {"success": True, "status": "ok", "message": "landing"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/hold")
async def hold():
    _require_connected()
    try:
        await drone.action.hold()
        return {"success": True, "status": "ok", "message": "holding position"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/rtl")
async def rtl():
    _require_connected()
    try:
        await drone.action.return_to_launch()
        return {"success": True, "status": "ok", "message": "returning to launch"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/emergency_stop")
async def emergency_stop():
    _require_connected()
    try:
        await drone.action.kill()
        return {"success": True, "status": "ok", "message": "emergency stop triggered"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/goto")
async def goto(req: GotoRequest):
    _require_connected()
    try:
        await drone.action.goto_location(req.latitude, req.longitude, req.altitude_m, 0)
        return {"success": True, "status": "ok", "message": f"heading to {req.latitude},{req.longitude}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/mission/upload")
async def mission_upload(payload: dict):
    return {"success": False, "status": "not_implemented", "message": "mission upload not yet implemented"}


@app.post("/mission/start")
async def mission_start():
    _require_connected()
    try:
        await drone.mission.start_mission()
        return {"success": True, "status": "ok", "message": "mission started"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/reasoning")
async def reasoning():
    return {
        "diagnostic_report": {
            "calculated_risk_percent": 0,
            "ai_analysis": "No active reasoning session.",
        }
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
