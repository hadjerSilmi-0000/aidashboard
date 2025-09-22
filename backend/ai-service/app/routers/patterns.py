"""
Router for pattern detection (outliers + trends).
"""

from fastapi import APIRouter
from app.services.pattern_detector import detect_patterns
from app.models.schemas import PatternRequest, PatternResponse

router = APIRouter()

@router.post("/detect", response_model=PatternResponse, tags=["Patterns"])
async def detect(payload: PatternRequest):
    result = detect_patterns(payload.dataset)
    return PatternResponse(**result)
