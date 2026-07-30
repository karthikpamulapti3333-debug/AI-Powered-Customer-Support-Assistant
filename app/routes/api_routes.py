from flask import Blueprint, jsonify, request
from app.models.ticket import Ticket
from app.models.chat import ChatSession, Message
from app.models.knowledge import KnowledgeBase
from app.extensions import db
from app.middleware.auth_middleware import admin_required, get_current_user_from_jwt

api_bp = Blueprint('api', __name__)

@api_bp.route('/login', methods=['POST'])
def api_login():
    from app.routes.admin_routes import login
    return login()

@api_bp.route('/chat', methods=['POST'])
def api_chat():
    from app.routes.chat_routes import send_message
    return send_message()

@api_bp.route('/tickets', methods=['GET', 'POST'])
def api_tickets():
    if request.method == 'POST':
        from app.routes.ticket_routes import create_ticket
        return create_ticket()
    else:
        user = get_current_user_from_jwt()
        if not user or user.role != 'ADMIN':
            return jsonify({"error": "Admin authentication required"}), 401
        tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
        return jsonify([t.to_dict() for t in tickets]), 200

@api_bp.route('/tickets/<int:ticket_id>', methods=['GET', 'PUT', 'DELETE'])
def api_ticket_detail(ticket_id):
    user = get_current_user_from_jwt()
    if not user or user.role != 'ADMIN':
        return jsonify({"error": "Admin authentication required"}), 401

    ticket = Ticket.query.get_or_404(ticket_id)
    if request.method == 'GET':
        return jsonify(ticket.to_dict()), 200
    elif request.method == 'PUT':
        data = request.get_json() or {}
        if 'status' in data:
            ticket.status = data['status']
        if 'priority' in data:
            ticket.priority = data['priority']
        db.session.commit()
        return jsonify(ticket.to_dict()), 200
    elif request.method == 'DELETE':
        db.session.delete(ticket)
        db.session.commit()
        return jsonify({"message": "Ticket deleted"}), 200

@api_bp.route('/kb', methods=['GET', 'POST'])
def api_kb():
    if request.method == 'POST':
        from app.routes.kb_routes import create_faq
        return create_faq()
    faqs = KnowledgeBase.query.filter_by(is_published=True).all()
    return jsonify([f.to_dict() for f in faqs]), 200

@api_bp.route('/admin/dashboard', methods=['GET'])
@admin_required()
def api_admin_dashboard():
    return jsonify({
        "totalTickets": Ticket.query.count(),
        "openTickets": Ticket.query.filter(Ticket.status.in_(['OPEN', 'PENDING', 'IN_PROGRESS'])).count(),
        "closedTickets": Ticket.query.filter(Ticket.status.in_(['RESOLVED', 'CLOSED'])).count(),
        "aiConversations": ChatSession.query.count(),
        "totalMessages": Message.query.count()
    }), 200
