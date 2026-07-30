from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import datetime
from app.config.settings import settings
from app.config.database import engine, Base, SessionLocal, get_db
from app.services.auth import hash_password

# Import routers
from app.api.auth import router as auth_router
from app.api.complaints import router as complaints_router
from app.api.conversations import router as conversations_router
from app.api.copilot import router as copilot_router
from app.api.analytics import router as analytics_router
from app.api.notifications import router as notifications_router
from app.api.admin import router as admin_router
from app.api.kb import router as kb_router
from app.api.gaps import router as gaps_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified Python backend exposing REST APIs and AI classification algorithms.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(conversations_router)
app.include_router(copilot_router)
app.include_router(analytics_router)
app.include_router(notifications_router)
app.include_router(admin_router)
app.include_router(kb_router)
app.include_router(gaps_router)

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Health endpoints
@app.get("/health")
@app.get("/api/health")
def read_health():
    return {"status": "UP", "message": "ResolveAI Backend is running"}

# Serve Frontend static files if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
assets_dir = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/")
@app.get("/{catchall:path}")
def serve_frontend_or_status(catchall: str = ""):
    if catchall and catchall.startswith("api"):
        return {"detail": "Not Found"}
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"status": "AI service and Backend are running", "project": settings.PROJECT_NAME}

# Seeding database function
def seed_database(db: Session):
    from app.models import Role, Department, User, Agent, ComplaintCategory, SLARule, RecommendedSolution
    
    # 1. Seed Roles
    roles_list = [
        {"id": 1, "name": "ROLE_ADMIN"},
        {"id": 2, "name": "ROLE_MANAGER"},
        {"id": 3, "name": "ROLE_AGENT"},
        {"id": 4, "name": "ROLE_CUSTOMER"}
    ]
    role_map = {}
    for r_data in roles_list:
        role = db.query(Role).filter(Role.name == r_data["name"]).first()
        if not role:
            role = Role(id=r_data["id"], name=r_data["name"])
            db.add(role)
            db.commit()
            db.refresh(role)
        role_map[r_data["name"]] = role

    # 2. Seed Departments
    depts = [
        {"id": 1, "name": "Billing & Payments", "desc": "Handles invoice queries, billing errors, payment failures, and refunds."},
        {"id": 2, "name": "Logistics & Delivery", "desc": "Handles shipping delays, incorrect shipping details, carrier issues, and packaging."},
        {"id": 3, "name": "Product Quality & Support", "desc": "Handles defective items, missing parts, product specs, and warranty claims."},
        {"id": 4, "name": "Account Security", "desc": "Handles hacked accounts, unauthorized activities, MFA issues, and login blocks."},
        {"id": 5, "name": "Technical Operations", "desc": "Handles website bugs, app failures, server downtime, and API issues."},
        {"id": 6, "name": "General Support", "desc": "Handles basic feedback, customer service reviews, and other general queries."}
    ]
    dept_map = {}
    for d in depts:
        dept = db.query(Department).filter(Department.name == d["name"]).first()
        if not dept:
            dept = Department(id=d["id"], name=d["name"], description=d["desc"])
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_map[d["id"]] = dept

    # 3. Seed Users
    users = [
        {"id": 1, "username": "admin", "pwd": "admin123", "email": "admin@resolveai.com", "first": "System", "last": "Administrator", "dept": None, "roles": ["ROLE_ADMIN", "ROLE_MANAGER"]},
        {"id": 2, "username": "manager", "pwd": "manager123", "email": "manager@resolveai.com", "first": "Support", "last": "Manager", "dept": None, "roles": ["ROLE_MANAGER"]},
        {"id": 3, "username": "agent_billing", "pwd": "agent123", "email": "agent.billing@resolveai.com", "first": "Sarah", "last": "Billing", "dept": 1, "roles": ["ROLE_AGENT"]},
        {"id": 4, "username": "agent_logistics", "pwd": "agent123", "email": "agent.logistics@resolveai.com", "first": "John", "last": "Logistics", "dept": 2, "roles": ["ROLE_AGENT"]},
        {"id": 5, "username": "agent_technical", "pwd": "agent123", "email": "agent.technical@resolveai.com", "first": "Alex", "last": "Tech", "dept": 5, "roles": ["ROLE_AGENT"]},
        {"id": 6, "username": "customer", "pwd": "customer123", "email": "customer@gmail.com", "first": "Jane", "last": "Doe", "dept": None, "roles": ["ROLE_CUSTOMER"]}
    ]
    
    for u in users:
        user = db.query(User).filter(User.username == u["username"]).first()
        if not user:
            user = User(
                id=u["id"],
                username=u["username"],
                password=hash_password(u["pwd"]),
                email=u["email"],
                first_name=u["first"],
                last_name=u["last"],
                department_id=u["dept"]
            )
            for r_name in u["roles"]:
                user.roles.append(role_map[r_name])
            db.add(user)
            db.commit()

            # If Agent role, link to Agents Table
            if "ROLE_AGENT" in u["roles"]:
                agent = db.query(Agent).filter(Agent.user_id == user.id).first()
                if not agent:
                    agent = Agent(
                        user_id=user.id,
                        department_id=u["dept"],
                        status="AVAILABLE",
                        max_concurrent_complaints=5,
                        current_complaints_count=0
                    )
                    db.add(agent)
                    db.commit()

    # 4. Seed Complaint Categories
    categories = [
        {"id": 1, "name": "PAYMENT", "display": "Billing & Payments", "desc": "Transaction issues, failed payments, billing discrepancies."},
        {"id": 2, "name": "DELIVERY", "display": "Logistics & Delivery", "desc": "Shipping delays, damaged packages, lost items."},
        {"id": 3, "name": "PRODUCT", "display": "Product Quality", "desc": "Defective or broken products, item not as described."},
        {"id": 4, "name": "ACCOUNT", "display": "Account Management", "desc": "Settings, profiles, subscription settings."},
        {"id": 5, "name": "TECHNICAL", "display": "Technical Failures", "desc": "Website/App glitches, system errors, login problems."},
        {"id": 6, "name": "REFUND", "display": "Refunds & Returns", "desc": "Refund status, return labels, credit request."},
        {"id": 7, "name": "SERVICE", "display": "Customer Service", "desc": "Agent behavior, delayed responses, service complaints."},
        {"id": 8, "name": "SECURITY", "display": "Account Security", "desc": "Hacking, phishing, unauthorized transactions, password reset issues."},
        {"id": 9, "name": "OTHER", "display": "Miscellaneous", "desc": "Anything else not covered by other categories."}
    ]
    for c in categories:
        cat = db.query(ComplaintCategory).filter(ComplaintCategory.name == c["name"]).first()
        if not cat:
            cat = ComplaintCategory(id=c["id"], name=c["name"], display_name=c["display"], description=c["desc"])
            db.add(cat)
            db.commit()

    # 5. Seed SLA Rules
    sla_rules = [
        {"id": 1, "priority": "LOW", "res_hours": 72, "warn_hours": 48},
        {"id": 2, "priority": "MEDIUM", "res_hours": 48, "warn_hours": 24},
        {"id": 3, "priority": "HIGH", "res_hours": 24, "warn_hours": 12},
        {"id": 4, "priority": "CRITICAL", "res_hours": 4, "warn_hours": 2}
    ]
    for s in sla_rules:
        rule = db.query(SLARule).filter(SLARule.priority == s["priority"]).first()
        if not rule:
            rule = SLARule(id=s["id"], priority=s["priority"], resolution_time_hours=s["res_hours"], warning_time_hours=s["warn_hours"])
            db.add(rule)
            db.commit()

    # 6. Seed Recommended Solutions
    solutions = [
        {
            "id": 1,
            "title": "Failed Payment Gateway Check",
            "desc": "Resolving payments that failed but debited funds",
            "cat": "PAYMENT",
            "intent": "PAYMENT_FAILED",
            "cause": "PAYMENT_GATEWAY_FAILURE",
            "steps": "1. Check Stripe/Paypal logs with transaction reference.\n2. Confirm if funds are captured or pending/voided.\n3. If captured but order not created, manually create order or issue immediate refund.\n4. Inform customer about bank reconciliation timeline (5-7 business days)."
        },
        {
            "id": 2,
            "title": "Delayed Shipment Investigation",
            "desc": "Tracking and pushing stuck orders in logistics",
            "cat": "DELIVERY",
            "intent": "ORDER_DELAY",
            "cause": "LOGISTICS_DELAY",
            "steps": "1. Query DHL/FedEx API for latest dispatch milestones.\n2. Open an escalation ticket with the courier agent.\n3. Contact carrier warehouse if package is stuck in customs.\n4. Send a formal delay notice to customer with revised delivery schedule and a shipping discount voucher."
        },
        {
            "id": 3,
            "title": "Defective Product Quality Check",
            "desc": "Process for handling returns of damaged or non-working products",
            "cat": "PRODUCT",
            "intent": "DAMAGED_PRODUCT",
            "cause": "DAMAGED_IN_TRANSIT",
            "steps": "1. Request photos/videos of the damaged item and packaging.\n2. Verify purchase details and check warranty state.\n3. Approve pre-paid return shipping label.\n4. Ship out new replacement unit immediately or issue full refund upon return shipment tracking update."
        }
    ]
    for s in solutions:
        sol = db.query(RecommendedSolution).filter(RecommendedSolution.title == s["title"]).first()
        if not sol:
            sol = RecommendedSolution(
                id=s["id"],
                title=s["title"],
                description=s["desc"],
                category=s["cat"],
                intent=s["intent"],
                root_cause=s["cause"],
                resolution_steps=s["steps"]
            )
            db.add(sol)
            db.commit()

@app.on_event("startup")
def startup_event():
    # Automatically create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed database
    db = SessionLocal()
    try:
        seed_database(db)
        print("Database initialized and seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
