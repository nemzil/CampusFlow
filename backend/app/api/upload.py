from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from fastapi.responses import FileResponse
from app.api.deps import get_current_user
from app.core.config import settings
import httpx
import hashlib
import time
import os
from pathlib import Path
import uuid

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/submissions")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/pdf")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """Upload a PDF locally and return the file URL."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Generate unique filename
    file_extension = ".pdf"
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Build full URL from request
    base_url = str(request.base_url).rstrip('/')
    file_url = f"{base_url}/api/upload/pdf/{unique_filename}"
    
    return {
        "url": file_url,
        "public_id": unique_filename
    }

@router.get("/pdf/{filename}")
async def get_pdf(filename: str):
    """Serve uploaded PDF file - no auth required for viewing"""
    # Security: only allow alphanumeric and hyphens in filename
    if not filename.replace('-', '').replace('.', '').isalnum():
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
