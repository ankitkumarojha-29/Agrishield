"""
File Storage and Media Retrieval API for AgriShield.
Handles secure file uploads, evidence persistence, and binary retrieval.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import FileRecord, User
from api.auth import get_current_user, _ok, _error
from core.validators import validate_uploaded_file, MAX_FILE_SIZE_BYTES

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION: FILE PERSISTENCE AND UPLOADS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("")
async def upload_file(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Persists uploaded document, scan, or damage claim evidence to database.
    Enforces maximum file size limit (15MB) and supported file formats.
    """
    try:
        content = await file.read()
        is_valid_file, file_err = validate_uploaded_file(
            filename=file.filename or "upload.bin",
            content_type=file.content_type,
            file_size=len(content)
        )
        if not is_valid_file:
            return _error("FILE_INVALID", file_err or "Invalid file payload", 400)
        
        file_record = FileRecord(
            data=content,
            mime_type=file.content_type or "application/octet-stream"
        )
        db.add(file_record)
        await db.commit()
        await db.refresh(file_record)
        
        return _ok({
            "id": str(file_record.id),
            "mime_type": file_record.mime_type
        })
    except HTTPException:
        raise
    except Exception as e:
        return _error("UPLOAD_FAILED", str(e), 500)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: FILE RETRIEVAL
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{id}")
async def get_file(id: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves stored file binary by unique UUID.
    """
    try:
        file_uuid = uuid.UUID(id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid file ID format")
        
    file_record = await db.get(FileRecord, file_uuid)
    if not file_record:
        raise HTTPException(status_code=404, detail="File record not found")
        
    return Response(content=file_record.data, media_type=file_record.mime_type)
