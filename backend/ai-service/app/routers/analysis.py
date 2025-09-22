"""
API routes for dataset analysis.
Accepts dataset input and returns structured statistical results.
"""

from fastapi import APIRouter
from app.models.schemas import AnalysisRequest, AnalysisResponse
from app.services.data_analyzer import run_analysis

router = APIRouter()

@router.post("/run", response_model=AnalysisResponse)
async def analyze_dataset(request: AnalysisRequest):
    result = run_analysis(request.dataset)
    return AnalysisResponse(**result)
