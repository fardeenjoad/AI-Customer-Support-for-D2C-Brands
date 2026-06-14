from typing import Optional
from pydantic import model_validator
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
    ENVIRONMENT: str = "development"
    PRIVY_APP_ID: Optional[str] = None
    PRIVY_APP_SECRET: Optional[str] = None

    FRONTEND_BASE_URL: str = "http://127.0.0.1:3000"
    BACKEND_BASE_URL: str = "http://127.0.0.1:8000"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024
    ALLOWED_UPLOAD_CONTENT_TYPES: str = "image/png,image/jpeg,image/webp,application/pdf,text/plain"
    PASSWORDLESS_PORTAL_ENABLED: bool = True

    # AWS Configurations
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_SES_SENDER_EMAIL: Optional[str] = None
    AWS_BEDROCK_MODEL_ID: str = "meta.llama3-70b-instruct-v1:0"
    AWS_S3_BUCKET_NAME: Optional[str] = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.CORS_ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def allowed_upload_content_types_set(self) -> set[str]:
        return {
            content_type.strip().lower()
            for content_type in self.ALLOWED_UPLOAD_CONTENT_TYPES.split(",")
            if content_type.strip()
        }

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.is_production:
            return self

        insecure_jwt_values = {
            "your_jwt_secret_key_change_me_in_production",
            "super_secret_jwt_key_for_d2c_customer_support_app_change_me",
        }
        if (
            not self.SUPABASE_URL
            or "your-project" in self.SUPABASE_URL
            or self.SUPABASE_URL == "https://your-project.supabase.co"
        ):
            raise ValueError("SUPABASE_URL must be a real Supabase project URL in production.")

        if not self.SUPABASE_KEY or self.SUPABASE_KEY.startswith("your-"):
            raise ValueError("SUPABASE_KEY must be configured in production.")

        if self.JWT_SECRET in insecure_jwt_values or len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be a strong non-placeholder value in production.")

        origins = self.cors_allowed_origins_list
        if not origins or "*" in origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must list explicit trusted origins in production.")

        if any("localhost" in origin or "127.0.0.1" in origin for origin in origins):
            raise ValueError("CORS_ALLOWED_ORIGINS cannot use localhost origins in production.")

        if "localhost" in self.FRONTEND_BASE_URL or "localhost" in self.BACKEND_BASE_URL:
            raise ValueError("FRONTEND_BASE_URL and BACKEND_BASE_URL must be public URLs in production.")

        if not self.AWS_ACCESS_KEY_ID or not self.AWS_SECRET_ACCESS_KEY:
            raise ValueError("AWS credentials are required for production attachment storage.")

        if not self.AWS_S3_BUCKET_NAME or self.AWS_S3_BUCKET_NAME == "resolveiq-attachments":
            raise ValueError("AWS_S3_BUCKET_NAME must be a real bucket in production.")

        has_email_provider = (
            self.RESEND_API_KEY
            and self.RESEND_API_KEY != "re_mock_api_key"
        ) or (
            self.AWS_SES_SENDER_EMAIL
            and self.AWS_SES_SENDER_EMAIL != "support@yourdomain.com"
        )
        if not has_email_provider:
            raise ValueError("Configure Resend or AWS SES before running in production.")

        has_ai_provider = (
            self.GROQ_API_KEY
            and self.GROQ_API_KEY != "gsk_mock_api_key_valid_format_dummy"
        ) or (
            self.AWS_ACCESS_KEY_ID
            and self.AWS_SECRET_ACCESS_KEY
            and self.AWS_BEDROCK_MODEL_ID
        )
        if not has_ai_provider:
            raise ValueError("Configure Groq or AWS Bedrock before running in production.")

        if self.PASSWORDLESS_PORTAL_ENABLED:
            raise ValueError("PASSWORDLESS_PORTAL_ENABLED must be false in production until OTP or magic-link verification is implemented.")

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton settings instance
settings = Settings()
