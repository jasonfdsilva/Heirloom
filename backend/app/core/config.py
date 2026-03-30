from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://heirloom:heirloom@localhost:5432/heirloom"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # S3 / MinIO
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "heirloom"
    S3_PUBLIC_URL: str = "http://localhost:9000/heirloom"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Garden defaults (zip 07922, Zone 6b)
    DEFAULT_LAST_FROST_DATE: str = "04-23"   # MM-DD
    DEFAULT_FIRST_FROST_DATE: str = "10-22"  # MM-DD

    # App
    APP_NAME: str = "Heirloom"
    DEBUG: bool = False


settings = Settings()
