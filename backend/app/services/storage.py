"""S3-compatible file storage via boto3. Works with MinIO locally and S3/Backblaze in production.
Switch between environments by changing S3_ENDPOINT_URL in .env — no code changes needed.
"""
import io
import mimetypes
import uuid

import boto3
from botocore.config import Config
from PIL import Image

from app.core.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=Config(signature_version="s3v4"),
        )
    return _client


def _object_key(prefix: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"{prefix}/{uuid.uuid4().hex}.{ext}"


async def upload_file(content: bytes, filename: str, prefix: str) -> str:
    key = _object_key(prefix, filename)
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    _get_client().put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    return f"{settings.S3_PUBLIC_URL}/{key}"


async def generate_thumbnail(content: bytes, prefix: str, size: tuple = (400, 400)) -> str | None:
    try:
        img = Image.open(io.BytesIO(content))
        img.thumbnail(size, Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        buf.seek(0)
        key = _object_key(prefix, "thumb.jpg")
        _get_client().put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=buf.getvalue(),
            ContentType="image/jpeg",
        )
        return f"{settings.S3_PUBLIC_URL}/{key}"
    except Exception:
        return None


async def delete_file(url: str) -> None:
    key = url.replace(f"{settings.S3_PUBLIC_URL}/", "")
    try:
        _get_client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    except Exception:
        pass
