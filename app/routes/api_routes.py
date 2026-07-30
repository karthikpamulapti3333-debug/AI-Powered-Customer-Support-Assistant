from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.ticket import Ticket
from app.models.chat import ChatSession, Message
from app.models.knowledge import KnowledgeBase
from app.models.notification import Notification
from app.extensions import db
from app.middleware.auth_middleware import admin_required

api_bp = Blueprint('api', __name__)

# --- Auth REST APIs ---
@api_bp.route('/register', methods=['POST'])
def api_register():
    from app.routes.auth_routes import register
    return register()

@api_bp.route('/login', methods=['POST'])
def api_login():
    from app.routes.auth_routes import login
    return login()

@api_bp.route('/logout', methods=['POST'])
def api_logout():
    from app.routes.auth_routes import logout
    return logout()

@api_bp.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def api_profile():
    from app.routes.auth_routes import profile
    return profile()

# --- Chat REST APIs ---
@api_bp.route('/chat', methods=['POST'])
def api_chat():
    from app.routes.chat_routes import send_message
    return send_message()

@api_bp.route('/chat/history', methods=['GET', 'DELETE'])
def api_chat_history():
    if request.method == 'DELETE':
        from app.routes.chat_routes import clear_chat_history
        return clear_chat_history()
    from app.routes.chat_routes import get_chat_history
    return get_chat_history()

# --- Ticket REST APIs ---
@api_bp.route('/tickets', methods=['GET', 'POST'])
def api_tickets():
    if request.method == 'POST':
        from app.routes.ticket_routes import create_ticket
        return create_ticket()
    
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity
    user = User.query.get(int(user_id)) if user_id else None
    
    if user and user.role == 'ADMIN':
        tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
    elif user:
        tickets = Ticket.query.filter_by(customer_id=user.id).order_by(Ticket.created_at.desc()).all()
    else:
        return jsonify({"error": "Authentication required"}), 401
        
    return jsonify([t.to_dict() for t in tickets]), 200

@api_bp.route('/tickets/<int:ticket_id>', methods=['GET', 'PUT', 'DELETE'])
def api_ticket_detail(ticket_id):
    if request.method == 'DELETE':
        from app.routes.ticket_routes import delete_ticket
        return delete_ticket(ticket_id)
    elif request.method == 'PUT':
        from app.routes.ticket_routes import update_status
        return update_status(ticket_id)
    from app.routes.ticket_routes import view_ticket
    return view_ticket(ticket_id)

# --- Notification REST APIs ---
@api_bp.route('/notifications', methods=['GET'])
@jwt_required()
def api_notifications():
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity
    notifs = Notification.query.filter_by(user_id=int(user_id)).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifs]), 200

# --- Admin REST APIs ---
@api_bp.route('/admin/dashboard', methods=['GET'])
@admin_required()
def api_admin_dashboard():
    total_customers = User.query.filter_by(role='CUSTOMER').count()
    total_tickets = Ticket.query.count()
    open_tickets = Ticket.query.filter(Ticket.status.in_(['OPEN', 'PENDING', 'IN_PROGRESS'])).count()
    closed_tickets = Ticket.query.filter(Ticket.status.in_(['RESOLVED', 'CLOSED'])).count()
    ai_conversations = ChatSession.query.count()

    return jsonify({
        "totalCustomers": total_customers,
        "totalTickets": total_tickets,
        "openTickets": open_tickets,
        "closedTickets": closed_tickets,
        "aiConversations": ai_conversations
    }), 200

@api_bp.route('/admin/users', methods=['GET'])
@admin_required()
def api_admin_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@api_bp.route('/admin/tickets', methods=['GET'])
@admin_required()
def api_admin_tickets():
    tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tickets]), 200

# --- KB REST APIs ---
@api_bp.route('/kb', methods=['GET', 'POST'])
def api_kb():
    if request.method == 'POST':
        from app.routes.kb_routes import create_faq
        return create_faq()
    from app.routes.kb_routes import list_faqs
    return list_faqs()

@api_bp.route('/kb/<int:faq_id>', methods=['PUT', 'DELETE'])
def api_kb_detail(faq_id):
    if request.method == 'DELETE':
        from app.routes.kb_routes import delete_faq
        return delete_faq(faq_id)
    from app.routes.kb_routes import update_faq
    return update_faq(faq_id)
