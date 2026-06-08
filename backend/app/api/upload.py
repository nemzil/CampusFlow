from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from app.api.deps import get_current_user
from app.core.config import settings
import httpx
import hashlib
import time

router = APIRouter()

@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """Upload a PDF to Cloudinary and return the secure URL."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    if not settings.CLOUDINARY_CLOUD_NAME or settings.CLOUDINARY_CLOUD_NAME in ("", "your_cloud_name"):
        raise HTTPException(status_code=503, detail="File upload not configured. Contact admin.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    timestamp = str(int(time.time()))
    folder = "campusflow/submissions"

    # Build Cloudinary signature
    params_to_sign = f"folder={folder}&timestamp={timestamp}"
    signature = hashlib.sha1(
        (params_to_sign + settings.CLOUDINARY_API_SECRET).encode()
    ).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/raw/upload"

    timeout = httpx.Timeout(connect=10.0, read=120.0, write=120.0, pool=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            upload_url,
            data={
                "api_key": settings.CLOUDINARY_API_KEY,
                "timestamp": timestamp,
                "folder": folder,
                "signature": signature,
            },
            files={"file": (file.filename, contents, "application/pdf")},
        )

    if response.status_code != 200:
        detail = response.json().get("error", {}).get("message", "Upload failed")
        raise HTTPException(status_code=500, detail=detail)

    data = response.json()
    return {"url": data["secure_url"], "public_id": data["public_id"]}
