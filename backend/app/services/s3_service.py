import os
import re
import uuid
import boto3
from urllib.parse import quote
from anyio.to_thread import run_sync
from app.core.config import settings

class S3Service:
    """
    Service class handling file uploads to AWS S3 bucket.
    Falls back gracefully to local filesystem storage if credentials are not set.
    """
    def __init__(self):
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.region = settings.AWS_REGION
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY

        # Check if keys are active and S3 is configured (ignoring placeholder bucket name)
        if (
            self.access_key 
            and self.secret_key 
            and self.bucket_name 
            and self.bucket_name != "resolveiq-attachments"
        ):
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
            self.client_active = True
        else:
            self.s3_client = None
            self.client_active = False

    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """
        Uploads file to the configured S3 bucket.
        Falls back to local file storage if S3 is not active.
        """
        if self.client_active:
            def _upload():
                safe_name = self._safe_storage_name(filename)
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=safe_name,
                    Body=file_content,
                    ContentType=content_type
                )
                return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{quote(safe_name)}"
            try:
                return await run_sync(_upload)
            except Exception as e:
                print(f"[S3 SERVICE ERROR] AWS S3 upload failed: {e}. Falling back to local storage.")

        if settings.is_production:
            raise RuntimeError("Attachment storage is not configured for production.")

        # Local storage fallback
        return await self._save_locally(file_content, filename)

    def _safe_storage_name(self, filename: str) -> str:
        """
        Builds a unique, filesystem-safe storage key from a user supplied name.
        """
        original_name = os.path.basename(filename or "upload")
        cleaned_name = re.sub(r"[^A-Za-z0-9._-]+", "_", original_name).strip("._-")
        if not cleaned_name:
            cleaned_name = "upload"
        return f"{uuid.uuid4().hex}-{cleaned_name[:120]}"

    async def _save_locally(self, file_content: bytes, filename: str) -> str:
        """
        Saves file to local filesystem static/uploads folder.
        """
        def _write():
            upload_dir = os.path.join("static", "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            safe_name = self._safe_storage_name(filename)
            filepath = os.path.join(upload_dir, safe_name)
            with open(filepath, "wb") as f:
                f.write(file_content)
            return f"{settings.BACKEND_BASE_URL.rstrip('/')}/static/uploads/{quote(safe_name)}"
        return await run_sync(_write)
