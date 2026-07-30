from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import datetime
from app.config.database import get_db
from app.config.settings import settings
from app.models import User, KnowledgeDocument, KnowledgeChunk
from app.services.auth import get_current_user
from app.services.document_parser import extract_text_from_file

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])

def split_text_into_chunks(text: str, chunk_size: int = 700, overlap: int = 150) -> list:
    chunks = []
    text_len = len(text)
    start = 0
    while start < text_len:
        end = min(start + chunk_size, text_len)
        if end < text_len:
            # Look for sentence boundary or space
            boundary = text.rfind("\n", end - 80, end)
            if boundary == -1:
                boundary = text.rfind(". ", end - 80, end)
            if boundary == -1:
                boundary = text.rfind(" ", end - 80, end)
            if boundary != -1:
                end = boundary + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start >= text_len or end >= text_len:
            break
    return chunks

@router.post("/documents/upload")
@router.post("/upload-document")
def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form("GENERAL"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Save file locally
    file_path = os.path.join(settings.UPLOAD_DIR, f"{datetime.datetime.utcnow().timestamp()}_{file.filename}")
    try:
        with open(file_path, "wb") as f:
            f.write(file.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Extract text content
    text = extract_text_from_file(file_path)
    if not text:
        # Cleanup file if parsing failed
        try:
            os.remove(file_path)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Unable to extract text content from this document format or file is empty")

    # Create document record
    doc = KnowledgeDocument(
        file_name=file.filename,
        file_type=file.content_type or os.path.splitext(file.filename)[1],
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        category=category
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk and index text
    chunks = split_text_into_chunks(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
    for i, c_text in enumerate(chunks):
        chunk_obj = KnowledgeChunk(
            document_id=doc.id,
            chunk_index=i,
            chunk_text=c_text
        )
        db.add(chunk_obj)
    
    db.commit()

    return {
        "id": doc.id,
        "fileName": doc.file_name,
        "fileType": doc.file_type,
        "fileSize": doc.file_size,
        "category": doc.category,
        "createdAt": doc.created_at
    }

@router.get("/documents")
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()
    results = []
    for d in docs:
        results.append({
            "id": d.id,
            "fileName": d.file_name,
            "fileType": d.file_type,
            "fileSize": d.file_size,
            "category": d.category,
            "createdAt": d.created_at
        })
    return results

@router.delete("/documents/{id}")
def delete_document(id: int, db: Session = Depends(get_db)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete local file
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Warning: could not delete local file {doc.file_path}: {e}")
            
    # Cascade delete chunks (SQL schema handles Cascade delete on CASCADE)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
