from fastapi import APIRouter
from app.services.classifier import vectorizer

router = APIRouter()

@router.get("/health")
async def health_check():
    models_ready = vectorizer is not None
    return {
        "status": "healthy",
        "models_loaded": models_ready,
        "environment": "Python 3.11+"
    }
