"""
Pydantic schemas for request/response validation.
Ensures data integrity and safe API contracts.
"""

from pydantic import BaseModel
from typing import Dict, Any,Optional

class AnalysisRequest(BaseModel):
    dataset: Dict[str, Any]

class AnalysisResponse(BaseModel):
    summary: Dict[str, Any]
    correlations: Dict[str, Any]
    missing_values: Dict[str, int]
 
class InsightRequest(BaseModel):
    # Accept either a raw dataset OR a precomputed analysis
    dataset: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None

class InsightResponse(BaseModel):
    text: str
    confidence: float
    source: str
# For pattern detector
class PatternRequest(BaseModel):
    dataset: Dict[str, Any]

class PatternResponse(BaseModel):
    outliers: Dict[str, list]
    trends: list

# For Q&A
class QuestionRequest(BaseModel):
    question: str
    context: Dict[str, Any]

class QuestionResponse(BaseModel):
    answer: str
    source: str
