"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Always resolve .env relative to this file's parent directory (backend/)
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    # AI
    openrouter_api_key: str
    ai_model: str = "openrouter/auto"

    # Database
    database_url: str

    # Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_days: int = 7

    # App
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
