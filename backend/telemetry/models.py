from pydantic import BaseModel


class Battery(BaseModel):
    voltage: float
    current: float
    percentage: float
    temperature: float


class Motor(BaseModel):
    id: int
    rpm: float
    current: float
    temperature: float


class GPS(BaseModel):
    satellites: int
    hdop: float
    latitude: float
    longitude: float
    altitude: float


class Communication(BaseModel):
    signal_strength: float
    packet_loss: float
    latency: float


class Mission(BaseModel):
    phase: str
    waypoint: int
    altitude: float


class Telemetry(BaseModel):
    battery: Battery
    motors: list[Motor]
    gps: GPS
    communication: Communication
    mission: Mission
    # Extended live fields
    velocity_ms: float = 0.0
    heading_deg: float = 0.0
    flight_mode: str = "UNKNOWN"
    armed: bool = False
    home_lat: float = 0.0
    home_lng: float = 0.0
