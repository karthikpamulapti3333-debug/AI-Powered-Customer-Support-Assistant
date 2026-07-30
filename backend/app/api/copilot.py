from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models import Complaint, RecommendedSolution, Message, ComplaintComment
from app.services.llm_gateway import llm_gateway

router = APIRouter(prefix="/api/copilot", tags=["Copilot"])

# Pydantic Schemas
class CopilotRequest(BaseModel):
    complaintId: int

@router.post("/suggest")
def get_suggestions(req: CopilotRequest, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == req.complaintId).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Fetch matching solutions based on category display name or code
    solutions = []
    if complaint.category:
        solutions = db.query(RecommendedSolution).filter(
            RecommendedSolution.category == complaint.category.name
        ).all()

    # Retrieve conversation context if available
    chat_history = []
    if complaint.conversation_id:
        msgs = db.query(Message).filter(Message.conversation_id == complaint.conversation_id).order_by(Message.created_at.asc()).all()
        for m in msgs:
            role = "user" if m.sender_role == "CUSTOMER" else "assistant"
            chat_history.append({"role": role, "text": m.message_text})
    else:
        comments = db.query(ComplaintComment).filter(ComplaintComment.complaint_id == complaint.id).order_by(ComplaintComment.created_at.asc()).all()
        for c in comments:
            role = "user" if c.user_id == complaint.customer_id else "assistant"
            chat_history.append({"role": role, "text": c.comment_text})

    # Generate suggestions from LLM gateway
    suggestions = llm_gateway.generate_copilot_suggestions(
        complaint.title,
        complaint.description,
        chat_history,
        solutions
    )

    return {
        "summary": suggestions.get("summary", "Query analysis in progress"),
        "intent": complaint.title,
        "sentiment": "NEUTRAL",
        "priority": complaint.priority,
        "escalationRisk": 0.25,
        "rootCause": "GENERAL",
        "recommendedActions": suggestions.get("recommendedActions", ["Verify ticket logs", "Formulate reply"]),
        "suggestedResponse": suggestions.get("suggestedResponse", "We are looking into this for you."),
        "sources": [s.title for s in solutions] if solutions else ["General Support Playbook"]
    }
