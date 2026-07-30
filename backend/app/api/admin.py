from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from app.config.database import get_db
from app.models import (
    User, Agent, Department, ComplaintCategory, RecommendedSolution, SLARule
)
from app.services.auth import require_role

router = APIRouter(prefix="/api/admin", tags=["Admin Management"], dependencies=[Depends(require_role(["ROLE_ADMIN", "ROLE_MANAGER"]))])

# Pydantic Request Schemas
class DepartmentRequest(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryRequest(BaseModel):
    name: str
    displayName: str
    description: Optional[str] = None

class SolutionRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    intent: Optional[str] = None
    rootCause: Optional[str] = None
    resolutionSteps: str

class SLARuleRequest(BaseModel):
    resolutionTimeHours: int
    warningTimeHours: int

# Users
@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    results = []
    for u in users:
        results.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "firstName": u.first_name,
            "lastName": u.last_name,
            "phone": u.phone,
            "roles": [r.name for r in u.roles],
            "department": {
                "id": u.department.id,
                "name": u.department.name
            } if u.department else None
        })
    return results

@router.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# Agents
@router.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    results = []
    for a in agents:
        results.append({
            "id": a.id,
            "username": a.user.username,
            "email": a.user.email,
            "status": a.status,
            "maxConcurrentComplaints": a.max_concurrent_complaints,
            "currentComplaintsCount": a.current_complaints_count,
            "department": {
                "id": a.department.id,
                "name": a.department.name
            } if a.department else None
        })
    return results

# Departments
@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    return [{"id": d.id, "name": d.name, "description": d.description} for d in depts]

@router.post("/departments")
def create_department(req: DepartmentRequest, db: Session = Depends(get_db)):
    if db.query(Department).filter(Department.name == req.name).first():
        raise HTTPException(status_code=400, detail="Department already exists")
    dept = Department(name=req.name, description=req.description)
    db.add(dept)
    db.commit()
    return {"message": "Department created successfully"}

@router.delete("/departments/{id}")
def delete_department(id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}

# Complaint Categories
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(ComplaintCategory).all()
    return [{"id": c.id, "name": c.name, "displayName": c.display_name, "description": c.description} for c in cats]

@router.post("/categories")
def create_category(req: CategoryRequest, db: Session = Depends(get_db)):
    if db.query(ComplaintCategory).filter(ComplaintCategory.name == req.name).first():
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = ComplaintCategory(name=req.name, display_name=req.displayName, description=req.description)
    db.add(cat)
    db.commit()
    return {"message": "Category created successfully"}

@router.delete("/categories/{id}")
def delete_category(id: int, db: Session = Depends(get_db)):
    cat = db.query(ComplaintCategory).filter(ComplaintCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}

# Recommended Solutions
@router.get("/solutions")
def list_solutions(db: Session = Depends(get_db)):
    sols = db.query(RecommendedSolution).all()
    results = []
    for s in sols:
        results.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "category": s.category,
            "intent": s.intent,
            "rootCause": s.root_cause,
            "resolutionSteps": s.resolution_steps
        })
    return results

@router.post("/solutions")
def create_solution(req: SolutionRequest, db: Session = Depends(get_db)):
    sol = RecommendedSolution(
        title=req.title,
        description=req.description,
        category=req.category,
        intent=req.intent,
        root_cause=req.rootCause,
        resolution_steps=req.resolutionSteps
    )
    db.add(sol)
    db.commit()
    return {"message": "Solution created successfully"}

@router.put("/solutions/{id}")
def update_solution(id: int, req: SolutionRequest, db: Session = Depends(get_db)):
    sol = db.query(RecommendedSolution).filter(RecommendedSolution.id == id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solution not found")
    sol.title = req.title
    sol.description = req.description
    sol.category = req.category
    sol.intent = req.intent
    sol.root_cause = req.rootCause
    sol.resolution_steps = req.resolutionSteps
    db.commit()
    return {"message": "Solution updated successfully"}

@router.delete("/solutions/{id}")
def delete_solution(id: int, db: Session = Depends(get_db)):
    sol = db.query(RecommendedSolution).filter(RecommendedSolution.id == id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solution not found")
    db.delete(sol)
    db.commit()
    return {"message": "Solution deleted successfully"}

# SLA Rules
@router.get("/sla-rules")
def list_sla_rules(db: Session = Depends(get_db)):
    rules = db.query(SLARule).all()
    return [{
        "id": r.id,
        "priority": r.priority,
        "resolutionTimeHours": r.resolution_time_hours,
        "warningTimeHours": r.warning_time_hours
    } for r in rules]

@router.put("/sla-rules/{id}")
def update_sla_rule(id: int, req: SLARuleRequest, db: Session = Depends(get_db)):
    rule = db.query(SLARule).filter(SLARule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="SLA Rule not found")
    rule.resolution_time_hours = req.resolutionTimeHours
    rule.warning_time_hours = req.warningTimeHours
    db.commit()
    return {"message": "SLA Rule updated successfully"}
