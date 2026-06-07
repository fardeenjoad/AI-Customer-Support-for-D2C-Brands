from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings and environment configuration using Pydantic Settings v2.
    Loads values from the environment or a local .env file.
    """
    SUPABASE_URL: str
    SUPABASE_KEY: str
    GROQ_API_KEY: str
    RESEND_API_KEY: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AWS Configurations
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_SES_SENDER_EMAIL: Optional[str] = None
    AWS_BEDROCK_MODEL_ID: str = "meta.llama3-70b-instruct-v1:0"
    AWS_S3_BUCKET_NAME: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton settings instance
settings = Settings()
