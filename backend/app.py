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
    allow_origins=["*"],  # tighten to your dashboard's exact origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """
    Connection truth lives here (not on /telemetry, which always answers
    even when PX4 is disconnected via mock fallback).
    """
    return {
        "status": "ok",
        "px4_connected": False,   # flip to True once the real PX4 bridge is wired in
        "mode": "simulation",     # "live" | "simulation"
    }


@app.get("/telemetry")
async def telemetry():
    """
    Shape matches what MissionMap / Topbar / useLiveTelemetry expect:
    - telemetry.gps.satellites, .latitude, .longitude, .altitude
    - telemetry.battery.percentage
    - telemetry.heading_deg (top-level, NOT under gps)
    - telemetry.velocity_ms (top-level, NOT ground_speed)
    """
    return {
        "gps": {
            "satellites": random.randint(8, 16),
            "hdop": round(random.uniform(0.6, 1.2), 2),
            "fix_type": "3D",
            "latitude": 37.4636,
            "longitude": -122.4286,
        }
    }
