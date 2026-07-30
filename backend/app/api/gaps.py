from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models import KnowledgeGap
from app.services.auth import require_role

router = APIRouter(prefix="/api/admin/knowledge-gaps", tags=["Knowledge Gaps"], dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])

@router.get("")
def list_knowledge_gaps(db: Session = Depends(get_db)):
    gaps = db.query(KnowledgeGap).order_by(KnowledgeGap.checked_at.desc()).all()
    results = []
    for g in gaps:
        results.append({
            "id": g.id,
            "queryText": g.query_text,
            "reason": g.reason,
            "checkedAt": g.checked_at,
            "resolved": g.resolved
        })
    return results

@router.put("/{id}/resolve")
def resolve_knowledge_gap(id: int, db: Session = Depends(get_db)):
    gap = db.query(KnowledgeGap).filter(KnowledgeGap.id == id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Knowledge gap record not found")
    gap.resolved = True
    db.commit()
    return {"message": "Knowledge gap resolved successfully"}
