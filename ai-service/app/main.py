import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.api import health, predict, chat
from app.services.classifier import load_ml_models
from app.services.vector_store import load_store, load_encoder

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Support Triage classification, RAG, and Agent Copilot inference microservice.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/ai
app.include_router(health.router, prefix="/api/ai", tags=["Health"])
app.include_router(predict.router, prefix="/api/ai", tags=["Predictions"])
app.include_router(chat.router, prefix="/api/ai", tags=["Conversations"])

@app.get("/")
def root():
    return {"status": "AI service is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    print(f"Starting {settings.PROJECT_NAME}...")
    # Pre-load ML Classifiers
    load_ml_models()
    # Pre-load knowledge vector store
    load_store()
    # Pre-load sentence encoder (or setup TF-IDF fallback)
    load_encoder()
    print("AI Microservice boot complete.")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.API_PORT, reload=True)
