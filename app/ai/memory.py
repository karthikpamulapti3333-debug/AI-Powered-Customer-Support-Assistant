from app.models.chat import Message

class ConversationMemory:
    @staticmethod
    def get_context(session_id: str, limit: int = 10):
        messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp.desc()).limit(limit).all()
        messages.reverse()
        return [{"sender": m.sender, "content": m.content, "timestamp": m.timestamp.isoformat()} for m in messages]
