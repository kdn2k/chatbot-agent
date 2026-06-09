from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "WebChat Operation Platform"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://webchat_user:webchat_pass@localhost:5432/webchat"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT: int = 60

    # Cho phép tất cả origin — nginx đã kiểm soát truy cập từ ngoài
    ALLOWED_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
