from telemetry.models import Battery, Motor, Telemetry


class FeatureExtractor:

    def battery_features(self, battery: Battery):

        return {
            "battery_voltage_low": battery.voltage < 15.0,
            "battery_current_high": battery.current > 20.0,
            "battery_temperature_high": battery.temperature > 60.0,
            "battery_percentage_low": battery.percentage < 25.0,
        }

    def motor_features(self, motor: Motor):

        return {
            "motor_rpm_low": motor.rpm < 7500,
            "motor_current_high": motor.current > 18.0,
            "motor_temperature_high": motor.temperature > 85.0,
        }

    def extract(self, telemetry: Telemetry):

        features = {}

        # Battery Features
        features.update(
            self.battery_features(telemetry.battery)
        )

        # Motor Features
        # Skip if no motors are available yet
        if telemetry.motors:
            features.update(
                self.motor_features(telemetry.motors[0])
            )
        else:
            features.update({
                "motor_rpm_low": False,
                "motor_current_high": False,
                "motor_temperature_high": False,
            })

        return features
    