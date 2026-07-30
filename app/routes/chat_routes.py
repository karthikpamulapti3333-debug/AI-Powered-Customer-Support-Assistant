import uuid
from flask import Blueprint, render_template, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat import ChatSession, Message
from app.models.user import User
from app.extensions import db
from app.ai.llm_client import llm_client
from app.ai.intent_detector import IntentDetector
from app.middleware.auth_middleware import get_current_user_from_jwt

chat_bp = Blueprint('chat', __name__)

@chat_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@chat_bp.route('/', methods=['GET'])
def chat_view():
    user = get_current_user_from_jwt()
    session_id = request.args.get('session_id')
    
    if not session_id:
        session_id = str(uuid.uuid4())

    return render_template('customer/chat.html', session_id=session_id, user=user)

@chat_bp.route('/message', methods=['POST'])
def send_message():
    data = request.get_json() or {}
    user_text = data.get('message', '').strip()
    session_id = data.get('sessionId', '').strip()

    if not user_text:
        return jsonify({"error": "Message text cannot be empty"}), 400

    if not session_id:
        session_id = str(uuid.uuid4())

    user = get_current_user_from_jwt()
    user_id = user.id if user else None

    # Get or Create Chat Session
    session = ChatSession.query.filter_by(session_id=session_id).first()
    if not session:
        session = ChatSession(session_id=session_id, user_id=user_id, title=user_text[:30])
        db.session.add(session)
        db.session.commit()

    # Intent and Sentiment
    intent = IntentDetector.detect_intent(user_text)
    sentiment = IntentDetector.analyze_sentiment(user_text)

    # Save User Message
    user_msg = Message(
        session_id=session_id,
        sender="USER",
        content=user_text,
        intent=intent,
        sentiment=sentiment
    )
    db.session.add(user_msg)
    db.session.commit()

    # Load Conversation History for Context Memory
    past_messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp.asc()).all()
    history = [{"sender": m.sender, "content": m.content} for m in past_messages]

    # Generate AI Response
    ai_result = llm_client.generate_response(user_text, history)
    ai_reply_text = ai_result.get("response", "")
    confidence = ai_result.get("confidence", 0.9)
    suggest_ticket = confidence < 0.6 or sentiment == "NEGATIVE"

    if suggest_ticket:
        ai_reply_text += "\n\n⚠️ *If this solution does not fully address your inquiry, click below to automatically convert this conversation into a **Support Ticket**.*"

    # Save AI Message
    ai_msg = Message(
        session_id=session_id,
        sender="AI",
        content=ai_reply_text,
        intent=intent,
        sentiment="NEUTRAL"
    )
    db.session.add(ai_msg)
    db.session.commit()

    return jsonify({
        "sessionId": session_id,
        "message": user_msg.to_dict(),
        "aiResponse": ai_msg.to_dict(),
        "confidence": confidence,
        "suggestTicket": suggest_ticket
    }), 200

@chat_bp.route('/history', methods=['GET'])
def get_chat_history():
    user = get_current_user_from_jwt()
    session_id = request.args.get('session_id')

    if session_id:
        messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp.asc()).all()
        return jsonify({"sessionId": session_id, "messages": [m.to_dict() for m in messages]}), 200

    if user:
        sessions = ChatSession.query.filter_by(user_id=user.id).order_by(ChatSession.updated_at.desc()).all()
        return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200

    return jsonify({"messages": []}), 200

@chat_bp.route('/history', methods=['DELETE'])
def clear_chat_history():
    session_id = request.args.get('session_id')
    if session_id:
        Message.query.filter_by(session_id=session_id).delete()
        ChatSession.query.filter_by(session_id=session_id).delete()
        db.session.commit()
        return jsonify({"message": "Chat history cleared successfully"}), 200

    user = get_current_user_from_jwt()
    if user:
        user_sessions = ChatSession.query.filter_by(user_id=user.id).all()
        for s in user_sessions:
            Message.query.filter_by(session_id=s.session_id).delete()
            db.session.delete(s)
        db.session.commit()
        return jsonify({"message": "All chat history cleared successfully"}), 200

    return jsonify({"error": "No session or user specified"}), 400
