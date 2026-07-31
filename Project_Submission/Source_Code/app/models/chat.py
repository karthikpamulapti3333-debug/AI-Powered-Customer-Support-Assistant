from datetime import datetime
from app.extensions import db

class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=True, default='Guest Conversation')
    status = db.Column(db.String(20), default='ACTIVE')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship('Message', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "title": self.title,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "messages": [m.to_dict() for m in self.messages]
        }

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), db.ForeignKey('chat_sessions.session_id'), nullable=False)
    sender = db.Column(db.String(20), nullable=False) # USER, AI
    content = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(50), nullable=True)
    sentiment = db.Column(db.String(20), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "sender": self.sender,
            "content": self.content,
            "intent": self.intent,
            "sentiment": self.sentiment,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
