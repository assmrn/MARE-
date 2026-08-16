"""
MARE MAVSDK Service
===================
Persistent singleton that owns the MAVSDK connection to PX4 SITL.
"""

import asyncio
import math
import logging
from typing import Optional, Set, Dict, Any

from mavsdk import System
from mavsdk.action import ActionError
from mavsdk.mission import MissionItem, MissionPlan

from telemetry.models import Battery, GPS, Communication, Mission, Motor, Telemetry

log = logging.getLogger("mare.mavsdk")

# ── Half Moon Bay, CA — default mission area ────────────────────────
MISSION_HOME_LAT = 37.4636
MISSION_HOME_LNG = -122.4286

# ── PX4 SITL default spawn (Zurich) — treat as "GPS not ready" ──────
PX4_DEFAULT_LAT = 47.397971
PX4_DEFAULT_LNG = 8.546164

def _is_zurich(lat: float, lng: float) -> bool:
    return abs(lat - PX4_DEFAULT_LAT) < 0.01 and abs(lng - PX4_DEFAULT_LNG) < 0.01

def _sanitize_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default

class MAVSDKService:
    def __init__(self, mock_provider=None):
        self.drone: System = System()
        self.connected: bool = False
        self._cache: Optional[Telemetry] = None
        self._mock = mock_provider
        
        # 1. Protect tasks from Garbage Collection
        self._bg_tasks: Set[asyncio.Task] = set()

        # 2. Shared state dictionary updated by background streams
        self._state: Dict[str, Any] = {
            "battery": None,
            "position": None,
            "velocity": 0.0,
            "heading": 0.0,
            "flight_mode": "UNKNOWN",
            "armed": False,
            "gps_info": None
        }

    # ── Startup ────────────────────────────────────────────────────

    async def start(self):
        """Called once from FastAPI startup event."""
        # Launch persistent subscription streams
        tasks = [
            self._connect_once(),
            self._monitor_connection(),
            self._stream_battery(),
            self._stream_position(),
            self._stream_velocity(),
            self._stream_heading(),
            self._stream_flight_mode(),
            self._stream_armed(),
            self._stream_gps_info(),
            self._cache_loop()
        ]
        
        for coro in tasks:
            task = asyncio.create_task(coro)
            self._bg_tasks.add(task)
            task.add_done_callback(self._bg_tasks.discard)
            
        log.info("MAVSDKService started with persistent streams.")

    # ── Connection management ──────────────────────────────────────

    async def _connect_once(self):
        try:
            log.info("Connecting via udpin://0.0.0.0:14540 …")
            await self.drone.connect(system_address="udpin://0.0.0.0:14540")
        except Exception as exc:
            log.error(f"drone.connect() raised: {exc}")

    async def _monitor_connection(self):
        while True:
            try:
                async for state in self.drone.core.connection_state():
                    was = self.connected
                    self.connected = state.is_connected
                    if self.connected and not was:
                        log.info("✅ PX4 SITL connected.")
                    elif not self.connected and was:
                        log.warning("⚠️ PX4 SITL disconnected.")
            except Exception as exc:
                log.error(f"connection_state stream error: {exc}")
                await asyncio.sleep(5)

    # ── Continuous Telemetry Streams ───────────────────────────────
    # These run forever, drastically reducing gRPC overhead.

    async def _stream_battery(self):
        while True:
            try:
                async for b in self.drone.telemetry.battery():
                    pct = b.remaining_percent
                    if pct is not None and pct <= 1.0:
                        pct = pct * 100
                    current = getattr(b, "current_battery_a", 0.0) or 0.0
                    self._state["battery"] = Battery(
                        voltage=round(_sanitize_float(b.voltage_v, 0.0), 2),
                        current=round(_sanitize_float(current, 0.0), 2),
                        percentage=round(_sanitize_float(pct, 0.0), 1),
                        temperature=0.0,
                    )
            except Exception:
                await asyncio.sleep(2)

    async def _stream_position(self):
        while True:
            try:
                async for p in self.drone.telemetry.position():
                    self._state["position"] = p
            except Exception:
                await asyncio.sleep(2)

    async def _stream_velocity(self):
        while True:
            try:
                async for v in self.drone.telemetry.velocity_ned():
                    self._state["velocity"] = math.sqrt(v.north_m_s ** 2 + v.east_m_s ** 2)
            except Exception:
                await asyncio.sleep(2)

    async def _stream_heading(self):
        while True:
            try:
                async for h in self.drone.telemetry.heading():
                    self._state["heading"] = h.heading_deg
            except Exception:
                try:
                    async for att in self.drone.telemetry.attitude_euler():
                        self._state["heading"] = att.yaw_deg % 360
                except Exception:
                    await asyncio.sleep(2)

    async def _stream_flight_mode(self):
        while True:
            try:
                async for mode in self.drone.telemetry.flight_mode():
                    self._state["flight_mode"] = str(mode).replace("FlightMode.", "")
            except Exception:
                await asyncio.sleep(2)

    async def _stream_armed(self):
        while True:
            try:
                async for armed in self.drone.telemetry.armed():
                    self._state["armed"] = armed
            except Exception:
                await asyncio.sleep(2)

    async def _stream_gps_info(self):
        while True:
            try:
                async for info in self.drone.telemetry.gps_info():
                    self._state["gps_info"] = info
            except Exception:
                await asyncio.sleep(2)


    # ── Telemetry cache builder ────────────────────────────────────

    async def _cache_loop(self):
        """Build the snapshot from the live state dict at 5 Hz."""
        while True:
            if self.connected:
                try:
                    self._cache = self._build_snapshot()
                except Exception as exc:
                    log.debug(f"Cache snapshot error: {exc}")
            elif self._mock:
                self._cache = self._mock.get_telemetry()
            await asyncio.sleep(0.2)

    def _build_snapshot(self) -> Telemetry:
        """Synchronously construct the Telemetry object from current state."""
        c = self._cache
        s = self._state

        # Defaults
        batt_default = c.battery if c else Battery(voltage=0, current=0, percentage=0, temperature=0)
        gps_default  = c.gps if c else GPS(satellites=0, hdop=9.9, latitude=MISSION_HOME_LAT, longitude=MISSION_HOME_LNG, altitude=0.0)

        battery = s["battery"] or batt_default
        position = s["position"]
        velocity = s["velocity"]
        heading = s["heading"]
        flight_mode = s["flight_mode"]
        armed = s["armed"]
        gps_info = s["gps_info"]

        # Merge satellite count
        satellites = gps_info.num_satellites if gps_info else (position.satellites if hasattr(position, "satellites") else 0)

        # Build GPS, applying Zurich guard
        if position is None or satellites == 0 or _is_zurich(position.latitude_deg, position.longitude_deg) or math.isnan(position.latitude_deg):
            gps = self._mock.get_telemetry().gps if self._mock else gps_default
        else:
            gps = GPS(
                satellites=satellites,
                hdop=_sanitize_float(position.hdop if hasattr(position, "hdop") else 0.9, 0.9),
                latitude=_sanitize_float(position.latitude_deg, MISSION_HOME_LAT),
                longitude=_sanitize_float(position.longitude_deg, MISSION_HOME_LNG),
                altitude=round(_sanitize_float(position.relative_altitude_m, 0.0), 2),
            )

        motors = self._mock.get_telemetry().motors if self._mock else []

        return Telemetry(
            battery=battery,
            motors=motors,
            gps=gps,
            communication=Communication(signal_strength=100.0, packet_loss=0.0, latency=0.0),
            mission=Mission(phase=flight_mode, waypoint=1, altitude=gps.altitude),
            velocity_ms=round(_sanitize_float(velocity, 0.0), 2),
            heading_deg=round(_sanitize_float(heading, 0.0), 1),
            flight_mode=flight_mode,
            armed=armed,
        )

    # ── Public API ─────────────────────────────────────────────────

    def get_cached_telemetry(self) -> Optional[Telemetry]:
        return self._cache

    # ── Action commands ────────────────────────────────────────────
    # (These remain completely unchanged as they are correct)

    async def arm(self):
        await self.drone.action.arm()

    async def disarm(self):
        await self.drone.action.disarm()

    async def takeoff(self, altitude_m: float = 10.0):
        await self.drone.action.set_takeoff_altitude(altitude_m)
        await self.drone.action.takeoff()

    async def land(self):
        await self.drone.action.land()

    async def hold(self):
        await self.drone.action.hold()

    async def rtl(self):
        await self.drone.action.return_to_launch()

    async def goto(self, lat: float, lng: float, alt_m: float, yaw_deg: float = float("nan")):
        await self.drone.action.goto_location(lat, lng, alt_m + 0.0, yaw_deg)

    async def upload_mission(self, waypoints: list[dict]):
        items = []
        for wp in waypoints:
            items.append(MissionItem(
                latitude_deg=float(wp["lat"]),
                longitude_deg=float(wp["lng"]),
                relative_altitude_m=float(wp.get("alt", 20.0)),
                speed_m_s=float(wp.get("speed", 10.0)),
                is_fly_through=True,
                gimbal_pitch_deg=0.0,
                gimbal_yaw_deg=0.0,
                camera_action=MissionItem.CameraAction.NONE,
                loiter_time_s=0.0,
                camera_photo_interval_s=0.0,
                acceptance_radius_m=2.0,
                yaw_deg=float("nan"),
                camera_photo_distance_m=0.0,
                vehicle_action=MissionItem.VehicleAction.NONE,
            ))
        await self.drone.mission.upload_mission(MissionPlan(items))

    async def start_mission(self):
        await self.drone.action.hold()
        await asyncio.sleep(1)
        await self.drone.mission.start_mission()

    async def emergency_stop(self):
        await self.drone.action.kill()


# ── Module-level singleton (imported by app.py) ────────────────────
mavsdk_service = MAVSDKService()