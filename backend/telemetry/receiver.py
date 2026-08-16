from mavsdk import System

from telemetry.models import (
    Battery,
    GPS,
    Communication,
    Mission,
    Telemetry,
)


class TelemetryReceiver:

    def __init__(self):
        self.drone = System()

    async def connect(self):
        print("Connecting to PX4...")

        await self.drone.connect(system_address="udpin://0.0.0.0:14540")

        async for state in self.drone.core.connection_state():
            if state.is_connected:
                print("Connected to PX4!")
                break

    async def get_battery(self):
        async for battery in self.drone.telemetry.battery():
            return Battery(
                voltage=round(battery.voltage_v, 2),
                current=0.0,
                percentage=round(battery.remaining_percent, 2),
                temperature=0.0,
            )

    async def get_position(self):
        async for position in self.drone.telemetry.position():
            return GPS(
                satellites=0,
                hdop=0.0,
                latitude=position.latitude_deg,
                longitude=position.longitude_deg,
                altitude=position.absolute_altitude_m,
            )

    async def get_telemetry(self):

        battery = await self.get_battery()
        gps = await self.get_position()

        communication = Communication(
            signal_strength=100.0,
            packet_loss=0.0,
            latency=0.0,
        )

        mission = Mission(
            phase="MISSION",
            waypoint=1,
            altitude=gps.altitude,
        )

        return Telemetry(
            battery=battery,
            motors=[],
            gps=gps,
            communication=communication,
            mission=mission,
        )