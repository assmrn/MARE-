"""""
MARE FastAPI Application
All communication between the React GCS dashboard and PX4 SITL passes
through this backend.  The frontend NEVER talks to PX4 directly.

Endpoint map
────────────
GET  /health            — backend + PX4 liveness
GET  /status            — alias for /health (legacy)
GET  /telemetry         — cached live telemetry snapshot
GET  /reasoning         — MARE reasoning engine result

POST /connect           — trigger manual reconnect
POST /arm               — arm motors
POST /disarm            — disarm motors
POST /takeoff           — take off to {altitude_m}
POST /land              — land in place
POST /hold              — loiter in place
POST /rtl               — return to launch
POST /mission/upload    — upload [{lat,lng,alt,speed}] waypoints
POST /mission/start     — start uploaded mission
POST /goto              — fly to {lat, lng, alt_m}
POST /emergency_stop    — kill all motors (emergency only)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from features.extractor import FeatureExtractor
from reasoning.engine import analyze_telemetry
from api.mock import MockTelemetryProvider
from api.mavsdk_service import mavsdk_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s — %(message)s")
log = logging.getLogger("mare.api")

app = FastAPI(
    title="MARE API",
    version="2.0.0",
    description="Mission Anomaly Reasoning Engine — Live PX4 Backend",
)

# ── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared singletons ────────────────────────────────────────────────
extractor     = FeatureExtractor()
mock_provider = MockTelemetryProvider()

# Wire mock into the MAVSDK service so it can fall back seamlessly
mavsdk_service._mock = mock_provider


# ── Lifecycle ────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    log.info("Starting MARE backend …")
    await mavsdk_service.start()


# ── Request / Response schemas ───────────────────────────────────────

class TakeoffRequest(BaseModel):
    altitude_m: float = 10.0

class GotoRequest(BaseModel):
    lat: float
    lng: float
    alt_m: float = 20.0
    yaw_deg: float = 0.0

class MissionWaypoint(BaseModel):
    lat: float
    lng: float
    alt: float = 20.0
    speed: float = 10.0

class MissionUploadRequest(BaseModel):
    waypoints: list[MissionWaypoint]


# ── Helper ──────────────────────────────────────────────────────────

def _require_connection():
    if not mavsdk_service.connected:
        raise HTTPException(status_code=503, detail="PX4 not connected. Start PX4 SITL and Gazebo first.")

def _get_telemetry():
    """Return cached live telemetry or fall back to mock."""
    t = mavsdk_service.get_cached_telemetry()
    if t is None:
        t = mock_provider.get_telemetry()
    return t


# ── READ Endpoints ───────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "MARE API Running",
        "version": "2.0.0",
        "px4_connected": mavsdk_service.connected,
        "mode": "live" if mavsdk_service.connected else "simulation",
    }


@app.get("/health")
async def health():
    """Liveness probe used by the dashboard connection indicator."""
    return {
        "backend": "online",
        "px4_connected": mavsdk_service.connected,
        "mode": "live" if mavsdk_service.connected else "simulation",
    }


@app.get("/status")
async def status():
    """Legacy alias kept for backwards compatibility."""
    return {
        "mode": "live" if mavsdk_service.connected else "simulation",
        "connected": mavsdk_service.connected,
    }


@app.get("/telemetry")
async def telemetry():
    """
    Returns the latest cached telemetry snapshot.
    The MAVSDK service refreshes the cache at 5 Hz so this endpoint
    returns immediately with zero blocking MAVSDK calls.
    """
    return _get_telemetry()


@app.get("/reasoning")
async def reasoning():
    """
    Runs the MARE reasoning engine against the current telemetry.
    Feeds it real live telemetry (or mock fallback).
    """
    telem = _get_telemetry()

    features: dict = {}
    features.update(extractor.battery_features(telem.battery))

    if telem.motors:
        features.update(extractor.motor_features(telem.motors[0]))
    else:
        features.update({
            "motor_rpm_low": False,
            "motor_current_high": False,
            "motor_temperature_high": False,
        })

    # Convert features to string and pass to your Gemini function
    ai_report = analyze_telemetry(str(features))
    return {"diagnostic_report": ai_report}


# ── WRITE Endpoints ──────────────────────────────────────────────────

@app.post("/connect")
async def connect():
    """Manually trigger a PX4 reconnect attempt."""
    try:
        asyncio.create_task(mavsdk_service._connect_once())
        return {"status": "reconnecting"}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/arm")
async def arm():
    _require_connection()
    try:
        await mavsdk_service.arm()
        return {"status": "success", "action": "arm"}
    except Exception as exc:
        raise HTTPException(400, f"Arm failed: {exc}")


@app.post("/disarm")
async def disarm():
    _require_connection()
    try:
        await mavsdk_service.disarm()
        return {"status": "success", "action": "disarm"}
    except Exception as exc:
        raise HTTPException(400, f"Disarm failed: {exc}")


@app.post("/takeoff")
async def takeoff(req: TakeoffRequest = TakeoffRequest()):
    _require_connection()
    try:
        await mavsdk_service.takeoff(req.altitude_m)
        return {"status": "success", "action": "takeoff", "altitude_m": req.altitude_m}
    except Exception as exc:
        raise HTTPException(400, f"Takeoff failed: {exc}")


@app.post("/land")
async def land():
    _require_connection()
    try:
        await mavsdk_service.land()
        return {"status": "success", "action": "land"}
    except Exception as exc:
        raise HTTPException(400, f"Land failed: {exc}")


@app.post("/hold")
async def hold():
    _require_connection()
    try:
        await mavsdk_service.hold()
        return {"status": "success", "action": "hold"}
    except Exception as exc:
        raise HTTPException(400, f"Hold failed: {exc}")


@app.post("/rtl")
async def rtl():
    _require_connection()
    try:
        await mavsdk_service.rtl()
        return {"status": "success", "action": "rtl"}
    except Exception as exc:
        raise HTTPException(400, f"RTL failed: {exc}")


@app.post("/goto")
async def goto(req: GotoRequest):
    _require_connection()
    try:
        await mavsdk_service.goto(req.lat, req.lng, req.alt_m, req.yaw_deg)
        return {"status": "success", "action": "goto", "lat": req.lat, "lng": req.lng}
    except Exception as exc:
        raise HTTPException(400, f"Goto failed: {exc}")


@app.post("/mission/upload")
async def mission_upload(req: MissionUploadRequest):
    _require_connection()
    try:
        wps = [wp.model_dump() for wp in req.waypoints]
        await mavsdk_service.upload_mission(wps)
        return {"status": "success", "action": "mission_upload", "waypoint_count": len(wps)}
    except Exception as exc:
        raise HTTPException(400, f"Mission upload failed: {exc}")


@app.post("/mission/start")
async def mission_start():
    _require_connection()
    try:
        await mavsdk_service.start_mission()
        return {"status": "success", "action": "mission_start"}
    except Exception as exc:
        raise HTTPException(400, f"Mission start failed: {exc}")


@app.post("/emergency_stop")
async def emergency_stop():
    """Kill all motors immediately. No connection check — always attempt."""
    try:
        await mavsdk_service.emergency_stop()
        return {"status": "success", "action": "emergency_stop"}
    except Exception as exc:
        raise HTTPException(500, f"Emergency stop error: {exc}")
