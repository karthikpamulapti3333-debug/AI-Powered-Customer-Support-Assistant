from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.config.database import get_db
from app.models import (
    User, Complaint, ComplaintAnalysis, ComplaintHistory, ComplaintComment,
    Agent, Department, ComplaintCategory, SLARule, CustomerFeedback, Notification, KnowledgeGap
)
from app.services.auth import get_current_user
from app.services.classifier import classifier

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

# Pydantic Schemas
class ComplaintCreateRequest(BaseModel):
    title: str
    description: str

class StatusUpdateRequest(BaseModel):
    status: str
    comment: Optional[str] = None

class CommentCreateRequest(BaseModel):
    commentText: str
    isInternal: Optional[bool] = False

class FeedbackCreateRequest(BaseModel):
    rating: int
    comments: Optional[str] = None

class AssignAgentRequest(BaseModel):
    agentId: int

@router.post("")
def create_complaint(req: ComplaintCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Run AI analysis
    ai_results = classifier.predict(req.description)
    
    # 2. Get category and department matching category display name
    cat_display = ai_results["category"]
    category = db.query(ComplaintCategory).filter(ComplaintCategory.name == cat_display).first()
    if not category:
        category = db.query(ComplaintCategory).filter(ComplaintCategory.id == 9).first() # OTHER fallback

    # 3. Find matching department
    dept = None
    if category:
        dept = db.query(Department).filter(Department.name == category.display_name).first()
    if not dept:
        dept = db.query(Department).filter(Department.id == 6).first() # General Support fallback

    # 4. Fetch SLA Rule
    priority_level = ai_results["priority"]
    sla_rule = db.query(SLARule).filter(SLARule.priority == priority_level).first()
    sla_hours = sla_rule.resolution_time_hours if sla_rule else 48
    sla_deadline = datetime.datetime.utcnow() + datetime.timedelta(hours=sla_hours)

    # 5. Auto-assign to available agent in department with lowest workload
    assigned_agent = None
    if dept:
        agents = db.query(Agent).filter(
            Agent.department_id == dept.id,
            Agent.status == "AVAILABLE"
        ).all()
        if agents:
            # Sort agents by workload ascending
            agents = sorted(agents, key=lambda a: a.current_complaints_count)
            assigned_agent = agents[0]
            
            # Increment agent workload
            assigned_agent.current_complaints_count += 1
            if assigned_agent.current_complaints_count >= assigned_agent.max_concurrent_complaints:
                assigned_agent.status = "BUSY"
            db.add(assigned_agent)

    # 6. Create Complaint
    complaint = Complaint(
        title=req.title,
        description=req.description,
        status="NEW",
        priority=priority_level,
        customer_id=user.id,
        category_id=category.id if category else None,
        assigned_agent_id=assigned_agent.id if assigned_agent else None,
        assigned_department_id=dept.id if dept else None,
        escalation_status="NONE",
        sla_deadline=sla_deadline
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # 7. Create Complaint Analysis
    analysis = ComplaintAnalysis(
        complaint_id=complaint.id,
        category=ai_results["category"],
        intent=ai_results["intent"],
        sentiment=ai_results["sentiment"],
        priority=ai_results["priority"],
        escalation_risk=ai_results["escalation_risk"],
        root_cause=ai_results["root_cause"],
        confidence_score=ai_results["confidence_score"],
        recommended_actions=", ".join([f"Check {ai_results['root_cause']} guidelines", "Follow SLA timelines"])
    )
    db.add(analysis)

    # 8. Create History
    history = ComplaintHistory(
        complaint_id=complaint.id,
        changed_by_user_id=user.id,
        action="CREATE",
        previous_status=None,
        new_status="NEW",
        comment="Ticket auto-generated and analyzed by AI."
    )
    db.add(history)

    # 9. Create Notifications
    customer_notify = Notification(
        user_id=user.id,
        title="Ticket Created Successfully",
        message=f"Your ticket '{req.title}' has been submitted. Reference ID: #{complaint.id}",
        type="COMPLAINT_CREATED",
        complaint_id=complaint.id
    )
    db.add(customer_notify)

    if assigned_agent:
        agent_notify = Notification(
            user_id=assigned_agent.user_id,
            title="New Ticket Assigned",
            message=f"New ticket #{complaint.id} ('{req.title}') has been assigned to you.",
            type="COMPLAINT_ASSIGNED",
            complaint_id=complaint.id
        )
        db.add(agent_notify)

    db.commit()

    # Re-fetch for response structure
    return {
        "id": complaint.id,
        "title": complaint.title,
        "description": complaint.description,
        "status": complaint.status,
        "priority": complaint.priority,
        "createdAt": complaint.created_at,
        "assignedAgent": {
            "id": assigned_agent.id,
            "username": assigned_agent.user.username
        } if assigned_agent else None
    }

@router.get("")
def get_complaints(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    categoryId: Optional[int] = None,
    customerId: Optional[int] = None,
    assignedAgentId: Optional[int] = None,
    assignedDepartmentId: Optional[int] = None,
    escalationStatus: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    
    # Non-admin/non-manager roles can only view their own tickets
    user_roles = [r.name for r in user.roles]
    if "ROLE_ADMIN" not in user_roles and "ROLE_MANAGER" not in user_roles:
        if "ROLE_AGENT" in user_roles:
            agent_profile = db.query(Agent).filter(Agent.user_id == user.id).first()
            if agent_profile:
                query = query.filter(Complaint.assigned_agent_id == agent_profile.id)
            else:
                return []
        else:
            # Customer gets their own tickets
            query = query.filter(Complaint.customer_id == user.id)

    # Apply URL filters
    if status:
        query = query.filter(Complaint.status == status)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if categoryId:
        query = query.filter(Complaint.category_id == categoryId)
    if customerId:
        query = query.filter(Complaint.customer_id == customerId)
    if assignedAgentId:
        query = query.filter(Complaint.assigned_agent_id == assignedAgentId)
    if assignedDepartmentId:
        query = query.filter(Complaint.assigned_department_id == assignedDepartmentId)
    if escalationStatus:
        query = query.filter(Complaint.escalation_status == escalationStatus)

    complaints_list = query.order_by(Complaint.created_at.desc()).all()
    results = []
    for c in complaints_list:
        results.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "priority": c.priority,
            "createdAt": c.created_at,
            "customer": {
                "id": c.customer.id,
                "username": c.customer.username,
                "email": c.customer.email
            } if c.customer else None,
            "category": {
                "id": c.category.id,
                "name": c.category.name,
                "displayName": c.category.display_name
            } if c.category else None,
            "assignedAgent": {
                "id": c.agent.id,
                "username": c.agent.user.username,
                "email": c.agent.user.email
            } if c.agent and c.agent.user else None,
            "assignedDepartment": {
                "id": c.department.id,
                "name": c.department.name
            } if c.department else None,
            "escalationStatus": c.escalation_status,
            "slaDeadline": c.sla_deadline
        })
    return results

@router.get("/{id}")
def get_complaint_by_id(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Check authorization
    user_roles = [r.name for r in user.roles]
    if "ROLE_ADMIN" not in user_roles and "ROLE_MANAGER" not in user_roles:
        if "ROLE_AGENT" in user_roles:
            agent = db.query(Agent).filter(Agent.user_id == user.id).first()
            if not agent or c.assigned_agent_id != agent.id:
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            if c.customer_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden")

    # Fetch feedback
    feedback = db.query(CustomerFeedback).filter(CustomerFeedback.complaint_id == c.id).first()
    analysis = db.query(ComplaintAnalysis).filter(ComplaintAnalysis.complaint_id == c.id).first()

    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "status": c.status,
        "priority": c.priority,
        "createdAt": c.created_at,
        "customer": {
            "id": c.customer.id,
            "username": c.customer.username,
            "email": c.customer.email,
            "phone": c.customer.phone
        } if c.customer else None,
        "category": {
            "id": c.category.id,
            "name": c.category.name,
            "displayName": c.category.display_name
        } if c.category else None,
        "assignedAgent": {
            "id": c.agent.id,
            "username": c.agent.user.username if c.agent.user else "Agent"
        } if c.agent else None,
        "assignedDepartment": {
            "id": c.department.id,
            "name": c.department.name
        } if c.department else None,
        "escalationStatus": c.escalation_status,
        "slaDeadline": c.sla_deadline,
        "feedback": {
            "rating": feedback.rating,
            "comments": feedback.comments
        } if feedback else None,
        "analysis": {
            "category": analysis.category,
            "intent": analysis.intent,
            "sentiment": analysis.sentiment,
            "priority": analysis.priority,
            "escalationRisk": analysis.escalation_risk,
            "rootCause": analysis.root_cause,
            "confidenceScore": analysis.confidence_score,
            "recommendedActions": analysis.recommended_actions
        } if analysis else None
    }

@router.put("/{id}/status")
def update_status(id: int, req: StatusUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    prev_status = c.status
    c.status = req.status
    
    if req.status in ["RESOLVED"]:
        c.resolved_at = datetime.datetime.utcnow()
        # Decrement agent workload if assigned
        if c.agent:
            c.agent.current_complaints_count = max(0, c.agent.current_complaints_count - 1)
            if c.agent.status == "BUSY" and c.agent.current_complaints_count < c.agent.max_concurrent_complaints:
                c.agent.status = "AVAILABLE"
            db.add(c.agent)
    elif req.status in ["CLOSED"]:
        c.closed_at = datetime.datetime.utcnow()

    # Record history
    history = ComplaintHistory(
        complaint_id=c.id,
        changed_by_user_id=user.id,
        action="UPDATE_STATUS",
        previous_status=prev_status,
        new_status=req.status,
        comment=req.comment or f"Status updated from {prev_status} to {req.status}."
    )
    db.add(history)

    # Notify customer
    notify = Notification(
        user_id=c.customer_id,
        title=f"Ticket #{c.id} Status Updated",
        message=f"Your ticket '{c.title}' status has changed to {req.status}.",
        type="STATUS_CHANGED",
        complaint_id=c.id
    )
    db.add(notify)
    db.commit()

    return {"message": "Status updated successfully", "status": c.status}

@router.post("/{id}/comments")
def add_comment(id: int, req: CommentCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comment = ComplaintComment(
        complaint_id=c.id,
        user_id=user.id,
        comment_text=req.commentText,
        is_internal=req.isInternal
    )
    db.add(comment)

    # Notify appropriate person
    notify_user_id = None
    if user.id == c.customer_id:
        # Customer commented, notify agent
        if c.agent:
            notify_user_id = c.agent.user_id
    else:
        # Agent/Admin commented, notify customer (unless internal comment)
        if not req.isInternal:
            notify_user_id = c.customer_id

    if notify_user_id:
        notify = Notification(
            user_id=notify_user_id,
            title="New Comment Received",
            message=f"New comment posted on ticket #{c.id} by {user.username}.",
            type="COMMENT_ADDED",
            complaint_id=c.id
        )
        db.add(notify)
    
    db.commit()
    return {
        "id": comment.id,
        "commentText": comment.comment_text,
        "createdAt": comment.created_at,
        "username": user.username
    }

@router.get("/{id}/comments")
def get_comments(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    query = db.query(ComplaintComment).filter(ComplaintComment.complaint_id == id)
    user_roles = [r.name for r in user.roles]
    # Customers cannot view internal comments
    if "ROLE_ADMIN" not in user_roles and "ROLE_MANAGER" not in user_roles and "ROLE_AGENT" not in user_roles:
        query = query.filter(ComplaintComment.is_internal == False)

    comments = query.order_by(ComplaintComment.created_at.asc()).all()
    results = []
    for comm in comments:
        results.append({
            "id": comm.id,
            "commentText": comm.comment_text,
            "isInternal": comm.is_internal,
            "createdAt": comm.created_at,
            "user": {
                "id": comm.user.id,
                "username": comm.user.username,
                "roles": [r.name for r in comm.user.roles]
            }
        })
    return results

@router.post("/{id}/feedback")
def add_feedback(id: int, req: FeedbackCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Delete existing if any
    db.query(CustomerFeedback).filter(CustomerFeedback.complaint_id == c.id).delete()

    feedback = CustomerFeedback(
        complaint_id=c.id,
        customer_id=user.id,
        rating=req.rating,
        comments=req.comments
    )
    db.add(feedback)

    # Log knowledge gap if rating is low
    if req.rating < 3:
        gap = KnowledgeGap(
            query_text=f"Complaint #{c.id} resolved poorly: '{c.title}'",
            reason="UNHELPFUL_FEEDBACK",
            resolved=False
        )
        db.add(gap)

    db.commit()
    return {"message": "Feedback submitted successfully"}

@router.post("/{id}/assign")
def assign_agent(id: int, req: AssignAgentRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    agent = db.query(Agent).filter(Agent.id == req.agentId).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    prev_agent_id = c.assigned_agent_id
    
    # Decrement workload from previous agent
    if c.agent:
        c.agent.current_complaints_count = max(0, c.agent.current_complaints_count - 1)
        if c.agent.status == "BUSY" and c.agent.current_complaints_count < c.agent.max_concurrent_complaints:
            c.agent.status = "AVAILABLE"
        db.add(c.agent)

    # Update to new agent
    c.assigned_agent_id = agent.id
    agent.current_complaints_count += 1
    if agent.current_complaints_count >= agent.max_concurrent_complaints:
        agent.status = "BUSY"
    db.add(agent)

    # Record history
    history = ComplaintHistory(
        complaint_id=c.id,
        changed_by_user_id=user.id,
        action="ASSIGN",
        previous_status=c.status,
        new_status=c.status,
        comment=f"Ticket manually reassigned to agent {agent.user.username}."
    )
    db.add(history)

    # Notify new agent
    notify = Notification(
        user_id=agent.user_id,
        title="Ticket Reassigned to You",
        message=f"Ticket #{c.id} ('{c.title}') has been assigned to you.",
        type="COMPLAINT_ASSIGNED",
        complaint_id=c.id
    )
    db.add(notify)

    db.commit()
    return {"message": "Agent assigned successfully"}

@router.post("/{id}/escalate")
def escalate_complaint(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    c.priority = "CRITICAL"
    c.escalation_status = "ESCALATED"
    c.sla_deadline = datetime.datetime.utcnow() + datetime.timedelta(hours=4) # Escalations have critical 4 hour SLA

    history = ComplaintHistory(
        complaint_id=c.id,
        changed_by_user_id=user.id,
        action="ESCALATE",
        previous_status=c.status,
        new_status=c.status,
        comment="Ticket manually escalated to Critical priority."
    )
    db.add(history)

    # Warn assigned agent and managers
    if c.agent:
        agent_notify = Notification(
            user_id=c.agent.user_id,
            title="TICKET ESCALATED",
            message=f"WARNING: Ticket #{c.id} has been escalated to CRITICAL priority.",
            type="COMPLAINT_ESCALATED",
            complaint_id=c.id
        )
        db.add(agent_notify)

    db.commit()
    return {"message": "Ticket escalated successfully", "priority": c.priority, "escalationStatus": c.escalation_status}
