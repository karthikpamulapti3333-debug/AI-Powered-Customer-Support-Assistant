from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.config.database import get_db
from app.models import User, Conversation, Message, KnowledgeGap
from app.services.auth import get_current_user
from app.services.vector_store import vector_store
from app.services.llm_gateway import llm_gateway
from app.services.classifier import classifier

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

# Pydantic Schemas
class MessageSendRequest(BaseModel):
    messageText: str

class FeedbackRequestDto(BaseModel):
    rating: int
    comment: Optional[str] = None

@router.get("")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_roles = [r.name for r in user.roles]
    query = db.query(Conversation)
    
    # Non-admin, non-manager, non-agents get only their own conversations
    if "ROLE_ADMIN" not in user_roles and "ROLE_MANAGER" not in user_roles and "ROLE_AGENT" not in user_roles:
        query = query.filter(Conversation.customer_id == user.id)
        
    conversations = query.order_by(Conversation.updated_at.desc()).all()
    results = []
    for c in conversations:
        results.append({
            "id": c.id,
            "status": c.status,
            "createdAt": c.created_at,
            "updatedAt": c.updated_at
        })
    return results

@router.post("")
def start_or_get_conversation(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find active conversation
    conv = db.query(Conversation).filter(
        Conversation.customer_id == user.id,
        Conversation.status.in_(["ACTIVE", "COMPLAINT_CREATED"])
    ).order_by(Conversation.created_at.desc()).first()

    if not conv:
        now = datetime.datetime.utcnow()
        conv = Conversation(
            customer_id=user.id,
            status="ACTIVE",
            created_at=now,
            updated_at=now
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        # Seed initial bot greeting message
        greeting = Message(
            conversation_id=conv.id,
            sender_role="AI",
            message_text="Hello! I am ResolveAI Support Assistant. How can I help you today?",
            is_ai=True,
            created_at=datetime.datetime.utcnow()
        )
        db.add(greeting)
        db.commit()
    else:
        # Update timestamp to bring it to top of dashboard list
        conv.updated_at = datetime.datetime.utcnow()
        db.add(conv)
        db.commit()
        db.refresh(conv)

    return {
        "id": conv.id,
        "status": conv.status,
        "createdAt": conv.created_at,
        "updatedAt": conv.updated_at
    }

@router.get("/{id}/messages")
def get_messages(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()
    results = []
    for m in messages:
        results.append({
            "id": m.id,
            "senderRole": m.sender_role,
            "messageText": m.message_text,
            "isAi": m.is_ai,
            "sentiment": m.sentiment,
            "intent": m.intent,
            "requiresHuman": m.requires_human,
            "sources": m.sources.split(",") if m.sources else [],
            "createdAt": m.created_at
        })
    return results

@router.post("/{id}/messages")
def send_message(id: int, req: MessageSendRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    text = req.messageText
    
    # 1. Classify customer query
    ai_cls = classifier.predict(text)
    
    # 2. Save user message
    user_msg = Message(
        conversation_id=conv.id,
        sender_role="CUSTOMER",
        message_text=text,
        is_ai=False,
        sentiment=ai_cls["sentiment"],
        intent=ai_cls["intent"],
        priority=ai_cls["priority"],
        escalation_risk=ai_cls["escalation_risk"],
        requires_human=ai_cls["escalation_risk"] > 0.7 or "agent" in text.lower() or "human" in text.lower()
    )
    db.add(user_msg)
    db.commit()

    # 3. Retrieve similar chunks for RAG
    chunks = vector_store.search_similar_chunks(db, text, top_k=3)
    
    # Log knowledge gap if query matches nothing in database and has intent
    if not chunks and "help" not in text.lower():
        gap = KnowledgeGap(
            query_text=text[:255],
            reason="NO_DOC_FOUND",
            resolved=False
        )
        db.add(gap)
        db.commit()

    # 4. Fetch chat history for context
    history_objs = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()
    chat_history = []
    for m in history_objs[:-1]: # exclude the one we just created to avoid duplicate
        role = "user" if m.sender_role == "CUSTOMER" else "assistant"
        chat_history.append({"role": role, "text": m.message_text})

    # 5. Generate AI response
    ai_reply = llm_gateway.generate_chat_response(text, chat_history, chunks, user=user, db=db)

    # 6. Save AI message
    sources_str = ",".join(ai_reply["sources"]) if ai_reply["sources"] else ""
    ai_msg = Message(
        conversation_id=conv.id,
        sender_role="AI",
        message_text=ai_reply["response"],
        is_ai=True,
        sources=sources_str,
        sentiment="POSITIVE",
        intent=ai_cls["intent"],
        requires_human=user_msg.requires_human
    )
    db.add(ai_msg)
    
    # Update conversation status and timestamp
    if user_msg.requires_human:
        conv.status = "COMPLAINT_CREATED"
    
    conv.updated_at = datetime.datetime.utcnow()
    db.add(conv)
    db.commit()
    db.refresh(ai_msg)

    return {
        "id": ai_msg.id,
        "senderRole": ai_msg.sender_role,
        "messageText": ai_msg.message_text,
        "isAi": ai_msg.is_ai,
        "intent": ai_msg.intent,
        "requiresHuman": ai_msg.requires_human,
        "sources": ai_reply["sources"],
        "createdAt": ai_msg.created_at
    }

@router.post("/{id}/feedback")
def submit_feedback(id: int, req: FeedbackRequestDto, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    conv.status = "RESOLVED"
    conv.updated_at = datetime.datetime.utcnow()
    db.add(conv)
    db.commit()
    return {"message": "Feedback submitted successfully"}

@router.delete("/{id}")
def delete_conversation(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    user_roles = [r.name for r in user.roles]
    if "ROLE_ADMIN" not in user_roles and "ROLE_MANAGER" not in user_roles and "ROLE_AGENT" not in user_roles:
        if conv.customer_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully"}

@router.put("/{id}/resolve")
def resolve_conversation(id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status = "RESOLVED"
    conv.updated_at = datetime.datetime.utcnow()
    db.add(conv)
    db.commit()
    return {"message": "Conversation marked as resolved"}

@router.put("/{id}/close")
def close_conversation(id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status = "CLOSED"
    conv.updated_at = datetime.datetime.utcnow()
    db.add(conv)
    db.commit()
    return {"message": "Conversation marked as closed"}
