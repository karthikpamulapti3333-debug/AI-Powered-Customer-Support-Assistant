import os

class Settings:
    PROJECT_NAME: str = "ResolveAI - Unified Python Backend"
    API_PORT: int = 8080

    # Project directories
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    MODELS_DIR: str = os.path.join(BASE_DIR, "models")
    VECTOR_DB_DIR: str = os.path.join(BASE_DIR, "vector_db")
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")

    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "404E635266556a586e3272357538782f413f4428472b4b6250645367566b5970")
    JWT_EXPIRATION_MS: int = int(os.getenv("JWT_EXPIRATION_MS", "86400000")) # Default 24 hours

    # LLM Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "LOCAL_SIMULATOR")
    AI_API_KEY: str = (
        os.getenv("AI_API_KEY", "") or
        os.getenv("OPENAI_API_KEY", "") or
        os.getenv("GEMINI_API_KEY", "") or
        os.getenv("GOOGLE_API_KEY", "") or
        os.getenv("ANTHROPIC_API_KEY", "")
    )
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")

    # RAG Settings
    CHUNK_SIZE: int = 700
    CHUNK_OVERLAP: int = 150
    TOP_K_RESULTS: int = 3

    # Frontend settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Database settings
    SPRING_PROFILES_ACTIVE: str = os.getenv("SPRING_PROFILES_ACTIVE", "dev")
    DB_URL: str = os.getenv("DB_URL", "")
    DB_USERNAME: str = os.getenv("DB_USERNAME", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    @property
    def DATABASE_URL(self) -> str:
        if self.SPRING_PROFILES_ACTIVE == "mysql" or self.DB_URL:
            url = self.DB_URL.strip()
            # Convert JDBC/Standard MySQL connection url into SQLAlchemy compatible format
            if url.startswith("jdbc:mysql://"):
                url = url.replace("jdbc:mysql://", "")
            
            # Remove any JDBC parameters from url
            if "?" in url:
                url_without_params, params = url.split("?", 1)
            else:
                url_without_params = url
                
            host_port = url_without_params
            dbname = "resolveai"
            
            if "/" in url_without_params:
                host_port, dbname = url_without_params.split("/", 1)
            
            user = self.DB_USERNAME or "root"
            password = self.DB_PASSWORD or ""
            
            if "@" in host_port:
                # If URL already contains username and password
                return f"mysql+pymysql://{host_port}/{dbname}"
            else:
                # Otherwise, format using username & password variables
                return f"mysql+pymysql://{user}:{password}@{host_port}/{dbname}"
        return "sqlite:///./resolveai.db"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.MODELS_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
