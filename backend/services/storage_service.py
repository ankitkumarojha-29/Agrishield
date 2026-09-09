import os
import uuid
from fastapi import UploadFile

# Store uploads locally for now
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

async def upload_file(file: UploadFile) -> str:
    """
    Saves an uploaded file locally and returns its relative URL path.
    Can be replaced later with Supabase Storage if bucket credentials are added.
    """
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
        
    # Generate a unique filename to avoid collisions
    ext = file.filename.split(".")[-1] if file.filename else "bin"
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    content = await file.read()
    with open(file_path, 'wb') as out_file:
        out_file.write(content)
        
    return f"/uploads/{unique_filename}"
