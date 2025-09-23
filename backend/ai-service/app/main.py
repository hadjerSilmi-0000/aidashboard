import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import analysis, insights, patterns, questions, ai_model


# Load environment variables
load_dotenv()

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

    # Middleware: CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # replace with frontend URL in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware: Logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = round(time.time() - start_time, 3)
        print(f" {request.method} {request.url.path} "
              f"({response.status_code}) in {duration}s")
        return response

     # Routers
    app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
    app.include_router(insights.router, prefix="/insights", tags=["Insights"])
    app.include_router(patterns.router, prefix="/patterns", tags=["Patterns"])
    app.include_router(questions.router, prefix="/questions", tags=["Questions"])
    app.include_router(ai_model.router, prefix="/models", tags=["AI Models"])

    return app


app = create_app()
