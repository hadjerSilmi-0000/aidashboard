from fastapi import APIRouter
from app.models.ai_model import AIModel
import os

router = APIRouter()

@router.get("/config")
async def get_model_config():
    return {
        "provider": os.getenv("MODEL_PROVIDER"),
        "ollama_model": os.getenv("OLLAMA_MODEL"),
        "huggingface_model": os.getenv("HUGGINGFACE_MODEL"),
        "openai_model": os.getenv("OPENAI_MODEL"),
    }

@router.post("/test")
async def test_model(model: AIModel):
    return {
        "status": "ok",
        "name": model.name,
        "provider": model.provider,
        "version": model.version or "N/A",
        "description": model.description or "N/A",
        "size": model.size or "N/A",
        "quantization": model.quantization or "N/A",
        "active": model.active,
        "created_at": model.created_at.isoformat()
    }
