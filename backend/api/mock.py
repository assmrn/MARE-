"""
Mock telemetry provider for when PX4/SITL is not connected.
Generates realistic, evolving drone telemetry so the GCS dashboard
always has data to display.
"""

import time
import math
import random

from telemetry.models import (
    Battery,
    Motor,
    GPS,
    Communication,
    Mission,
    Telemetry,
)


# Half Moon Bay coastal survey waypoints
WAYPOINTS = [
    (37.4636, -122.4286),  # WP1: Takeoff
    (37.4658, -122.4228),  # WP2: Survey Alpha
    (37.4682, -122.4168),  # WP3: Turbine Sector
    (37.4720, -122.4115),  # WP4: Survey Beta
    (37.4688, -122.4085),  # WP5: Payload Release
    (37.4636, -122.4286),  # WP6: Home Landing
]


class MockTelemetryProvider:
    """
    Generates realistic mock telemetry that evolves over time.
    Simulates a drone flying a waypoint mission with battery drain,
    altitude changes, and GPS movement.
    """

    def __init__(self):
        self.start_time = time.time()
        self.current_wp_index = 0
        self.lat = WAYPOINTS[0][0]
        self.lng = WAYPOINTS[0][1]
        self.altitude = 10.0
        self.battery_pct = 98.0
        self.last_tick = time.time()

    def _tick(self):
        """Advance the simulation by one step."""
        now = time.time()
        dt = now - self.last_tick
        self.last_tick = now

        # Battery drain
        self.battery_pct = max(5.0, self.battery_pct - 0.04 * dt)

        # Move toward current waypoint
        if self.current_wp_index < len(WAYPOINTS):
            target_lat, target_lng = WAYPOINTS[self.current_wp_index]
            dlat = target_lat - self.lat
            dlng = target_lng - self.lng
            dist = math.sqrt(dlat ** 2 + dlng ** 2)

            speed_deg_per_sec = 0.00004  # ~4.4 m/s

            if dist < speed_deg_per_sec * dt * 2:
                # Reached waypoint
                self.lat = target_lat
                self.lng = target_lng
                self.current_wp_index += 1
                if self.current_wp_index >= len(WAYPOINTS):
                    self.current_wp_index = 0  # Loop
                    self.battery_pct = 98.0
            else:
                self.lat += (dlat / dist) * speed_deg_per_sec * dt
                self.lng += (dlng / dist) * speed_deg_per_sec * dt

        # Altitude targets per waypoint
        target_alts = [10, 45, 45, 40, 35, 0]
        wp_idx = min(self.current_wp_index, len(target_alts) - 1)
        target_alt = target_alts[wp_idx]
        self.altitude += (target_alt - self.altitude) * 0.05 * dt

    def get_telemetry(self) -> Telemetry:
        self._tick()

        elapsed = time.time() - self.start_time
        noise = random.gauss(0, 0.3)

        voltage = round(24.6 - ((100 - self.battery_pct) * 0.05) + noise * 0.1, 2)
        current = round(14.5 + noise + math.sin(elapsed * 0.1) * 2, 2)
        temp = round(28.0 + elapsed * 0.01 + noise, 1)

        battery = Battery(
            voltage=max(18.0, voltage),
            current=max(0, current),
            percentage=round(self.battery_pct, 2),
            temperature=temp,
        )

        gps = GPS(
            satellites=16 + int(noise),
            hdop=round(0.9 + abs(noise) * 0.1, 2),
            latitude=round(self.lat, 7),
            longitude=round(self.lng, 7),
            altitude=round(self.altitude + noise, 1),
        )

        signal = max(20, min(100, round(98 + noise * 2)))
        communication = Communication(
            signal_strength=signal,
            packet_loss=round(max(0, 0.1 + noise * 0.05), 2),
            latency=round(max(5, 12 + noise * 3), 1),
        )

        wp_num = min(self.current_wp_index + 1, len(WAYPOINTS))
        phases = ["TAKEOFF", "MISSION", "MISSION", "MISSION", "MISSION", "LANDING"]
        phase = phases[min(self.current_wp_index, len(phases) - 1)]

        mission = Mission(
            phase=phase,
            waypoint=wp_num,
            altitude=round(self.altitude, 1),
        )

        # Anomaly simulation: bearing degradation on Motor 1 after 25s
        is_anomaly = elapsed >= 25.0
        anomaly_factor = min(1.0, (elapsed - 25.0) / 10.0) if is_anomaly else 0.0

        motors = []
        for i in range(1, 5):
            if i == 1:
                # Motor 1 experiences friction heating, RPM drop, and current surge
                target_rpm = 8500 - (1300 * anomaly_factor)
                target_current = 4.2 + (5.3 * anomaly_factor)
                target_temp = 42.0 + elapsed * 0.005 + (50.0 * anomaly_factor)
                
                motors.append(Motor(
                    id=i,
                    rpm=round(target_rpm + noise * 150),
                    current=round(target_current + noise * 0.3, 2),
                    temperature=round(target_temp + noise * 1.5, 1),
                ))
            else:
                motors.append(Motor(
                    id=i,
                    rpm=round(8500 + noise * 200 + math.sin(elapsed * 0.3 + i) * 100),
                    current=round(4.2 + noise * 0.5, 2),
                    temperature=round(42 + elapsed * 0.005 + noise * 2, 1),
                ))

        return Telemetry(
            battery=battery,
            motors=motors,
            gps=gps,
            communication=communication,
            mission=mission,
        )
