from datetime import datetime
import uuid
from app.extensions import db

class Ticket(db.Model):
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True)
    ticket_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    customer_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False, default='GENERAL')
    priority = db.Column(db.String(20), nullable=False, default='MEDIUM') # LOW, MEDIUM, HIGH, CRITICAL
    status = db.Column(db.String(20), nullable=False, default='OPEN') # OPEN, PENDING, RESOLVED, CLOSED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    replies = db.relationship('TicketReply', backref='ticket', lazy=True, cascade='all, delete-orphan')

    @staticmethod
    def generate_code():
        return f"TICK-{uuid.uuid4().hex[:8].upper()}"

    def to_dict(self):
        return {
            "id": self.id,
            "ticketCode": self.ticket_code,
            "customerName": self.customer_name,
            "email": self.email,
            "phone": self.phone or "",
            "subject": self.subject,
            "description": self.description,
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "replies": [r.to_dict() for r in self.replies]
        }

class TicketReply(db.Model):
    __tablename__ = 'ticket_replies'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Admin ID if staff reply
    message = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='ticket_replies', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "ticketId": self.ticket_id,
            "userId": self.user_id,
            "userName": self.user.full_name if self.user else "Support Agent",
            "message": self.message,
            "isInternal": self.is_internal,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
