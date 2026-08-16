from telemetry.models import Telemetry


class MissionAnalyzer:

    MAX_FLIGHT_TIME_MINUTES = 30.0
    TIME_PER_WAYPOINT_MINUTES = 1.0

    def estimate_remaining_flight_time(self, telemetry: Telemetry) -> float:
        """
        Estimate remaining flight time based on battery percentage.
        """

        return (
            telemetry.battery.percentage / 100.0
        ) * self.MAX_FLIGHT_TIME_MINUTES

    def estimate_remaining_mission_time(self, telemetry: Telemetry) -> float:
        """
        Estimate mission duration remaining.
        """

        remaining_waypoints = max(0, 10 - telemetry.mission.waypoint)

        return (
            remaining_waypoints
            * self.TIME_PER_WAYPOINT_MINUTES
        )

    def analyze(self, telemetry: Telemetry):

        flight_time = self.estimate_remaining_flight_time(
            telemetry
        )

        mission_time = self.estimate_remaining_mission_time(
            telemetry
        )

        safety_margin = flight_time - mission_time

        return {
            "remaining_flight_time": round(flight_time, 2),
            "remaining_mission_time": round(mission_time, 2),
            "safety_margin": round(safety_margin, 2),
            "mission_feasible": safety_margin >= 0,
        }