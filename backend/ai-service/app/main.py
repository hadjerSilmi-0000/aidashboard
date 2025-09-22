"""
Main entry point for the AI Service (FastAPI).
Handles app initialization, router registration, and middleware setup.
"""

import os
from fastapi import FastAPI
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Debug log (optional, helps confirm env is loaded)
print("MODEL_PROVIDER =", os.getenv("MODEL_PROVIDER"))
print("OLLAMA_MODEL =", os.getenv("OLLAMA_MODEL"))

# Routers
from app.routers import analysis, insights, patterns, questions

def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Service",
        description="FastAPI microservice for AI-powered analysis and insights",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Routers
    app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
    app.include_router(insights.router, prefix="/insights", tags=["Insights"])
    app.include_router(patterns.router, prefix="/patterns", tags=["Patterns"])
    app.include_router(questions.router, prefix="/questions", tags=["Questions"])

    # Middleware (CORS, Logging, etc. can be added later)

    return app

# App instance
app = create_app()
