"""
Router exposing /insights/generate
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import InsightRequest, InsightResponse
from app.services.insight_generator import generate_insights
from app.services.data_analyzer import run_analysis

router = APIRouter()

@router.post("/generate", response_model=InsightResponse, tags=["Insights"])
async def insights_generate(payload: InsightRequest):
    """
    Accepts either a raw dataset or precomputed analysis.
    If dataset is passed, we run run_analysis first.
    """
    try:
        if payload.analysis:
            analysis = payload.analysis
        else:
            analysis = run_analysis(payload.dataset or {})
        result = generate_insights(analysis)
        return InsightResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
