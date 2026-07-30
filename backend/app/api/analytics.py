from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
from app.config.database import get_db
from app.models import Complaint, ComplaintAnalysis, Agent, SLARule
from app.services.auth import require_role

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_summary(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    resolved = db.query(Complaint).filter(Complaint.status.in_(["RESOLVED", "CLOSED"])).count()
    open_count = total - resolved
    
    # SLA Breached: status not resolved/closed AND sla_deadline < now
    now = datetime.datetime.utcnow()
    sla_breached = db.query(Complaint).filter(
        Complaint.status.notin_(["RESOLVED", "CLOSED"]),
        Complaint.sla_deadline < now
    ).count()

    return {
        "totalTickets": total,
        "resolvedTickets": resolved,
        "openTickets": open_count,
        "slaBreachedTickets": sla_breached
    }

@router.get("/categories", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_categories(db: Session = Depends(get_db)):
    # Group by category
    results = db.query(Complaint).all()
    counts = {}
    for r in results:
        name = r.category.display_name if r.category else "Unassigned"
        counts[name] = counts.get(name, 0) + 1
        
    return [{"categoryName": k, "count": v} for k, v in counts.items()]

@router.get("/sentiment", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_sentiment(db: Session = Depends(get_db)):
    results = db.query(ComplaintAnalysis.sentiment, func.count(ComplaintAnalysis.id)).group_by(ComplaintAnalysis.sentiment).all()
    return [{"sentiment": r[0] or "NEUTRAL", "count": r[1]} for r in results]

@router.get("/priority", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_priority(db: Session = Depends(get_db)):
    results = db.query(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority).all()
    return [{"priority": r[0], "count": r[1]} for r in results]

@router.get("/sla", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_sla(db: Session = Depends(get_db)):
    resolved = db.query(Complaint).filter(Complaint.status.in_(["RESOLVED", "CLOSED"])).all()
    total_resolved = len(resolved)
    
    in_compliance = 0
    breached_list = []
    
    for r in resolved:
        # Check if resolved before deadline
        resolve_time = r.resolved_at or r.closed_at or r.updated_at
        if r.sla_deadline and resolve_time <= r.sla_deadline:
            in_compliance += 1
            
    now = datetime.datetime.utcnow()
    breached_active = db.query(Complaint).filter(
        Complaint.status.notin_(["RESOLVED", "CLOSED"]),
        Complaint.sla_deadline < now
    ).all()
    
    for b in breached_active:
        breached_list.append({
            "id": b.id,
            "title": b.title,
            "priority": b.priority,
            "slaDeadline": b.sla_deadline
        })

    rate = (in_compliance / total_resolved * 100) if total_resolved > 0 else 100.0
    return {
        "complianceRate": round(rate, 2),
        "breachedTickets": breached_list
    }

@router.get("/agents", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_agents_workload(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    results = []
    for a in agents:
        results.append({
            "agentName": f"{a.user.first_name or ''} {a.user.last_name or ''}".strip() or a.user.username,
            "email": a.user.email,
            "activeCount": a.current_complaints_count,
            "status": a.status
        })
    return results

@router.get("/trends", dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])
def get_trends(db: Session = Depends(get_db)):
    # Counts of tickets created daily for last 7 days
    trends = []
    now = datetime.datetime.utcnow()
    for i in range(6, -1, -1):
        date = now - datetime.timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Count tickets created on this day
        start = datetime.datetime(date.year, date.month, date.day, 0, 0, 0)
        end = datetime.datetime(date.year, date.month, date.day, 23, 59, 59)
        count = db.query(Complaint).filter(Complaint.created_at.between(start, end)).count()
        
        trends.append({
            "date": date_str,
            "count": count
        })
    return trends
