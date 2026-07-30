from sqlalchemy import Table, Column, String, Integer, Double, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.types import BIGINT
from sqlalchemy.orm import relationship
import datetime
from app.config.database import Base

# Association table for User-Role Many-to-Many
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BIGINT, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BIGINT, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)

class Department(Base):
    __tablename__ = "departments"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    department_id = Column(BIGINT, ForeignKey("departments.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    department = relationship("Department")
    roles = relationship("Role", secondary=user_roles, lazy="subquery")

class Agent(Base):
    __tablename__ = "agents"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(BIGINT, ForeignKey("departments.id", ondelete="SET NULL"))
    status = Column(String(50), default="AVAILABLE")
    max_concurrent_complaints = Column(Integer, default=5)
    current_complaints_count = Column(Integer, default=0)

    user = relationship("User")
    department = relationship("Department")

class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(100))
    description = Column(String(255))

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="NEW")
    priority = Column(String(50), default="MEDIUM")
    customer_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BIGINT, ForeignKey("complaint_categories.id", ondelete="SET NULL"))
    assigned_agent_id = Column(BIGINT, ForeignKey("agents.id", ondelete="SET NULL"))
    assigned_department_id = Column(BIGINT, ForeignKey("departments.id", ondelete="SET NULL"))
    conversation_id = Column(BIGINT, ForeignKey("conversations.id", ondelete="SET NULL"))
    escalation_status = Column(String(50), default="NONE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    sla_deadline = Column(DateTime, nullable=True)

    customer = relationship("User", foreign_keys=[customer_id])
    category = relationship("ComplaintCategory")
    agent = relationship("Agent")
    department = relationship("Department")
    conversation = relationship("Conversation", foreign_keys=[conversation_id])

class ComplaintAnalysis(Base):
    __tablename__ = "complaint_analysis"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    complaint_id = Column(BIGINT, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False)
    category = Column(String(100))
    intent = Column(String(100))
    sentiment = Column(String(100))
    priority = Column(String(100))
    escalation_risk = Column(Double)
    root_cause = Column(String(255))
    confidence_score = Column(Double)
    recommended_actions = Column(Text)
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint")

class ComplaintHistory(Base):
    __tablename__ = "complaint_history"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    complaint_id = Column(BIGINT, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    changed_by_user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100))
    previous_status = Column(String(50))
    new_status = Column(String(50))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint")
    changed_by = relationship("User")

class ComplaintComment(Base):
    __tablename__ = "complaint_comments"
    __tablename__ = "complaint_comments"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    complaint_id = Column(BIGINT, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class RecommendedSolution(Base):
    __tablename__ = "recommended_solutions"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    intent = Column(String(100))
    root_cause = Column(String(100))
    resolution_steps = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class CustomerFeedback(Base):
    __tablename__ = "customer_feedback"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    complaint_id = Column(BIGINT, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False)
    customer_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer)
    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint")
    customer = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String(50))
    complaint_id = Column(BIGINT, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    complaint_id = Column(BIGINT, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100))
    file_path = Column(String(255), nullable=False)
    file_size = Column(BIGINT)
    uploaded_by_user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    uploaded_by = relationship("User")

class SLARule(Base):
    __tablename__ = "sla_rules"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    priority = Column(String(50), unique=True, nullable=False)
    resolution_time_hours = Column(Integer, nullable=False)
    warning_time_hours = Column(Integer, nullable=False)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    customer_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("User")

class Message(Base):
    __tablename__ = "messages"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    conversation_id = Column(BIGINT, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_role = Column(String(50), nullable=False)
    message_text = Column(Text, nullable=False)
    is_ai = Column(Boolean, default=False)
    sentiment = Column(String(50))
    confidence = Column(Double)
    intent = Column(String(100))
    priority = Column(String(50))
    escalation_risk = Column(Double)
    requires_human = Column(Boolean, default=False)
    sources = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation")

class ConversationAnalysis(Base):
    __tablename__ = "conversation_analysis"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    conversation_id = Column(BIGINT, ForeignKey("conversations.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary = Column(Text)
    intent = Column(String(100))
    sentiment = Column(String(100))
    priority = Column(String(100))
    escalation_risk = Column(Double)
    root_cause = Column(String(255))
    recommended_actions = Column(Text)
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100))
    file_path = Column(String(255), nullable=False)
    file_size = Column(BIGINT)
    category = Column(String(100), default="GENERAL")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    document_id = Column(BIGINT, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("KnowledgeDocument")

class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    query_text = Column(String(255), nullable=False)
    reason = Column(String(255))
    checked_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved = Column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    user_id = Column(BIGINT, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100))
    target_id = Column(BIGINT)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    token = Column(String(255), unique=True, nullable=False)
    user_id = Column(BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expiry_date = Column(DateTime, nullable=False)

    user = relationship("User")
