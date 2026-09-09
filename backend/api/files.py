import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.session import get_db
from db.models import FileRecord, User
from api.auth import get_current_user, _ok, _error

router = APIRouter()

@router.post("")
async def upload_file(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        content = await file.read()
        
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
    except Exception as e:
        return _error("UPLOAD_FAILED", str(e), 500)

@router.get("/{id}")
async def get_file(id: str, db: AsyncSession = Depends(get_db)):
    try:
        file_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file ID")
        
    file_record = await db.get(FileRecord, file_uuid)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
        
    return Response(content=file_record.data, media_type=file_record.mime_type)
