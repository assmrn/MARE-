from pydantic import BaseModel


class ReasoningResult(BaseModel):
    hypothesis: str
    confidence: float
    risk: str
    recommendation: str

    # New fields
    reason: str
    mission_feasible: bool
