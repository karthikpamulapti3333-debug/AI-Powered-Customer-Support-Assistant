import uuid
from flask import Blueprint, request, jsonify
from app.models.chat import ChatSession, Message
from app.extensions import db
from app.ai.llm_client import llm_client
from app.ai.intent_detector import IntentDetector

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/message', methods=['POST'])
def send_message():
    data = request.get_json() or {}
    user_text = data.get('message', '').strip()
    session_id = data.get('sessionId', '').strip()

    if not user_text:
        return jsonify({"error": "Message text cannot be empty"}), 400

    if not session_id:
        session_id = str(uuid.uuid4())

    # Get or Create Guest Chat Session
    session = ChatSession.query.filter_by(session_id=session_id).first()
    if not session:
        session = ChatSession(session_id=session_id, title=user_text[:30])
        db.session.add(session)
        db.session.commit()

    # Detect Intent & Sentiment
    intent = IntentDetector.detect_intent(user_text)
    sentiment = IntentDetector.analyze_sentiment(user_text)

    # Save Guest Message
    user_msg = Message(
        session_id=session_id,
        sender="USER",
        content=user_text,
        intent=intent,
        sentiment=sentiment
    )
    db.session.add(user_msg)
    db.session.commit()

    # Load Past Messages for Memory Context
    past_messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp.asc()).all()
    history = [{"sender": m.sender, "content": m.content} for m in past_messages]

    # Generate AI Response
    ai_result = llm_client.generate_response(user_text, history)
    ai_reply_text = ai_result.get("response", "")
    confidence = ai_result.get("confidence", 0.9)
    suggest_ticket = confidence < 0.6 or sentiment == "NEGATIVE"

    if suggest_ticket and "couldn't fully resolve" not in ai_reply_text.lower():
        ai_reply_text += "\n\n⚠️ *I couldn't fully resolve your issue. Would you like to create a support ticket?*"

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
    session_id = request.args.get('session_id')
    if session_id:
        messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp.asc()).all()
        return jsonify({"sessionId": session_id, "messages": [m.to_dict() for m in messages]}), 200
    return jsonify({"messages": []}), 200

@chat_bp.route('/history', methods=['DELETE'])
def clear_chat_history():
    session_id = request.args.get('session_id')
    if session_id:
        Message.query.filter_by(session_id=session_id).delete()
        ChatSession.query.filter_by(session_id=session_id).delete()
        db.session.commit()
        return jsonify({"message": "Chat conversation cleared successfully"}), 200
    return jsonify({"error": "session_id parameter required"}), 400
