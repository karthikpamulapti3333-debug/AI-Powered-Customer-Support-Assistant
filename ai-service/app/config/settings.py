import os

# Load .env file manually if exists
for env_path in [".env", "../.env", "../../.env"]:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key:
                        os.environ[key] = val

class Settings:
    PROJECT_NAME: str = "ResolveAI - AI Microservice"
    API_PORT: int = 8000
    
    # ML Models path
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    MODELS_DIR: str = os.path.join(BASE_DIR, "models")
    
    # Vector DB settings
    VECTOR_DB_DIR: str = os.path.join(BASE_DIR, "vector_db")
    
    # RAG parameters
    CHUNK_SIZE: int = 700
    CHUNK_OVERLAP: int = 150
    TOP_K_RESULTS: int = 3
    
    # LLM configurations
    # Options: "GOOGLE", "OPENAI", "ANTHROPIC", "LOCAL_SIMULATOR"
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "OPENAI")
    AI_API_KEY: str = (
        os.getenv("AI_API_KEY", "") or 
        os.getenv("OPENAI_API_KEY", "") or 
        os.getenv("GEMINI_API_KEY", "") or 
        os.getenv("GOOGLE_API_KEY", "") or 
        os.getenv("ANTHROPIC_API_KEY", "")
    )
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo")
    
    # Overrides and configurations matching Phase 2 specifications
    AI_MODEL: str = os.getenv("AI_MODEL", os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo"))
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.MODELS_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
