"""
Router for natural language Q&A.
"""

from fastapi import APIRouter
from app.services.question_answerer import answer_question
from app.models.schemas import QuestionRequest, QuestionResponse

router = APIRouter()

@router.post("/ask", response_model=QuestionResponse, tags=["Questions"])
async def ask(payload: QuestionRequest):
    result = answer_question(payload.question, payload.context)
    return QuestionResponse(**result)
