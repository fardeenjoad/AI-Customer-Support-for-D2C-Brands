import os
import boto3
from typing import Optional
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
                safe_name = os.path.basename(filename)
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=safe_name,
                    Body=file_content,
                    ContentType=content_type
                )
                return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{safe_name}"
            try:
                return await run_sync(_upload)
            except Exception as e:
                print(f"[S3 SERVICE ERROR] AWS S3 upload failed: {e}. Falling back to local storage.")

        # Local storage fallback
        return await self._save_locally(file_content, filename)

    async def _save_locally(self, file_content: bytes, filename: str) -> str:
        """
        Saves file to local filesystem static/uploads folder.
        """
        def _write():
            upload_dir = os.path.join("static", "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            safe_name = os.path.basename(filename)
            filepath = os.path.join(upload_dir, safe_name)
            with open(filepath, "wb") as f:
                f.write(file_content)
            return f"http://localhost:8000/static/uploads/{safe_name}"
        return await run_sync(_write)
