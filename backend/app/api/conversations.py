from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.config.database import get_db
from app.models import (
    User, Conversation, Message, KnowledgeGap, Complaint,
    ComplaintCategory, SLARule, Agent, Department, ComplaintAnalysis,
    ComplaintHistory, Notification
)
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
        requires_human=False
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

    # Determine if escalation is explicitly requested or triggered
    text_lower = text.lower()
    should_escalate = (
        text == "Please escalate this issue to a human agent and create a ticket immediately." or
        "create a ticket" in text_lower or
        "open a ticket" in text_lower or
        "escalate" in text_lower
    )
    
    # Avoid double escalation in same conversation
    existing_ticket = db.query(Complaint).filter(Complaint.conversation_id == conv.id).first()
    if existing_ticket:
        should_escalate = False

    ai_reply_sources = []

    if should_escalate:
        # Get category display name matching classifier category prediction
        cat_display = ai_cls["category"]
        category = db.query(ComplaintCategory).filter(ComplaintCategory.name == cat_display).first()
        if not category:
            category = db.query(ComplaintCategory).filter(ComplaintCategory.id == 9).first() # OTHER fallback

        # Find matching department
        dept = None
        if category:
            dept = db.query(Department).filter(Department.name == category.display_name).first()
        if not dept:
            dept = db.query(Department).filter(Department.id == 6).first() # General Support fallback

        # Fetch SLA Rule
        priority_level = ai_cls["priority"]
        sla_rule = db.query(SLARule).filter(SLARule.priority == priority_level).first()
        sla_hours = sla_rule.resolution_time_hours if sla_rule else 48
        sla_deadline = datetime.datetime.utcnow() + datetime.timedelta(hours=sla_hours)

        # Auto-assign to available agent in department with lowest workload
        assigned_agent = None
        if dept:
            agents = db.query(Agent).filter(
                Agent.department_id == dept.id,
                Agent.status == "AVAILABLE"
            ).all()
            if agents:
                agents = sorted(agents, key=lambda a: a.current_complaints_count)
                assigned_agent = agents[0]
                assigned_agent.current_complaints_count += 1
                if assigned_agent.current_complaints_count >= assigned_agent.max_concurrent_complaints:
                    assigned_agent.status = "BUSY"
                db.add(assigned_agent)

        # Create Complaint
        ticket_title = f"AI Escalated: {text[:47]}..." if len(text) > 50 else f"AI Escalated: {text}"
        complaint = Complaint(
            title=ticket_title,
            description=f"This ticket was auto-escalated from a chatbot conversation. Last customer query: {text}",
            status="NEW",
            priority=priority_level,
            customer_id=user.id,
            category_id=category.id if category else None,
            assigned_agent_id=assigned_agent.id if assigned_agent else None,
            assigned_department_id=dept.id if dept else None,
            conversation_id=conv.id,
            escalation_status="NONE",
            sla_deadline=sla_deadline
        )
        db.add(complaint)
        db.commit()
        db.refresh(complaint)

        # Create Analysis
        analysis = ComplaintAnalysis(
            complaint_id=complaint.id,
            category=ai_cls["category"],
            intent=ai_cls["intent"],
            sentiment=ai_cls["sentiment"],
            priority=ai_cls["priority"],
            escalation_risk=ai_cls["escalation_risk"],
            root_cause=ai_cls["root_cause"],
            confidence_score=ai_cls["confidence_score"],
            recommended_actions=", ".join([f"Check {ai_cls['root_cause']} guidelines", "Follow SLA timelines"])
        )
        db.add(analysis)

        # Create History
        history = ComplaintHistory(
            complaint_id=complaint.id,
            changed_by_user_id=user.id,
            action="CREATE",
            previous_status=None,
            new_status="NEW",
            comment="Ticket auto-generated from escalated chatbot session."
        )
        db.add(history)

        # Create Notifications
        customer_notify = Notification(
            user_id=user.id,
            title="Ticket Created Successfully",
            message=f"Your ticket '{complaint.title}' has been submitted. Reference ID: #CMP-{complaint.id}",
            type="COMPLAINT_CREATED",
            complaint_id=complaint.id
        )
        db.add(customer_notify)

        if assigned_agent:
            agent_notify = Notification(
                user_id=assigned_agent.user_id,
                title="New Ticket Assigned",
                message=f"New escalated ticket #CMP-{complaint.id} has been assigned to you.",
                type="COMPLAINT_ASSIGNED",
                complaint_id=complaint.id
            )
            db.add(agent_notify)

        conv.status = "COMPLAINT_CREATED"
        db.add(conv)
        db.commit()

        # Update user msg requires_human status
        user_msg.requires_human = True
        db.add(user_msg)
        db.commit()

        # AI reply text
        ai_response_text = f"I have automatically created a support ticket (Ticket ID: **CMP-{complaint.id}**) in our system to get this investigated. A human agent from our team will contact you shortly. Feel free to keep chatting with me here!"
    else:
        # Standard chatbot answer
        # 4. Fetch chat history for context
        history_objs = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()
        chat_history = []
        for m in history_objs[:-1]: # exclude the one we just created
            role = "user" if m.sender_role == "CUSTOMER" else "assistant"
            chat_history.append({"role": role, "text": m.message_text})

        # 5. Generate AI response
        ai_reply = llm_gateway.generate_chat_response(text, chat_history, chunks, user=user, db=db)
        ai_response_text = ai_reply["response"]
        ai_reply_sources = ai_reply["sources"]

    # 6. Save AI message
    sources_str = ",".join(ai_reply_sources) if ai_reply_sources else ""
    ai_msg = Message(
        conversation_id=conv.id,
        sender_role="AI",
        message_text=ai_response_text,
        is_ai=True,
        sources=sources_str,
        sentiment="POSITIVE",
        intent=ai_cls["intent"],
        requires_human=should_escalate
    )
    db.add(ai_msg)
    
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
        "sources": ai_reply_sources,
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
