from flask import Blueprint, render_template, redirect, url_for, flash, jsonify, Response
from sqlalchemy import func
from app.models.user import User
from app.models.ticket import Ticket
from app.models.chat import ChatSession, Message
from app.models.knowledge import KnowledgeBase
from app.extensions import db
from app.middleware.auth_middleware import get_current_user_from_jwt, admin_required
from app.utils.exporter import export_tickets_csv

admin_bp = Blueprint('admin', __name__)

@admin_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@admin_bp.route('/dashboard')
@admin_required()
def dashboard():
    total_customers = User.query.filter_by(role='CUSTOMER').count()
    total_tickets = Ticket.query.count()
    open_tickets = Ticket.query.filter(Ticket.status.in_(['OPEN', 'PENDING', 'IN_PROGRESS'])).count()
    closed_tickets = Ticket.query.filter(Ticket.status.in_(['RESOLVED', 'CLOSED'])).count()
    ai_conversations = ChatSession.query.count()

    recent_tickets = Ticket.query.order_by(Ticket.created_at.desc()).limit(6).all()
    recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()

    return render_template(
        'admin/dashboard.html',
        total_customers=total_customers,
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        closed_tickets=closed_tickets,
        ai_conversations=ai_conversations,
        recent_tickets=recent_tickets,
        recent_users=recent_users
    )

@admin_bp.route('/users')
@admin_required()
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return render_template('admin/users.html', users=users)

@admin_bp.route('/analytics')
@admin_required()
def analytics():
    # Tickets by status
    status_counts = db.session.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    status_data = {status: count for status, count in status_counts}

    # Tickets by category
    cat_counts = db.session.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all()
    category_data = {cat: count for cat, count in cat_counts}

    # Recent chat activity
    chat_counts = db.session.query(func.date(Message.timestamp), func.count(Message.id)).group_by(func.date(Message.timestamp)).limit(7).all()
    chat_data = {str(date): count for date, count in chat_counts}

    if request.is_json or request.args.get('format') == 'json':
        return jsonify({
            "statusData": status_data,
            "categoryData": category_data,
            "chatData": chat_data
        }), 200

    return render_template('admin/analytics.html', status_data=status_data, category_data=category_data, chat_data=chat_data)

@admin_bp.route('/export/tickets')
@admin_required()
def export_tickets():
    csv_data = export_tickets_csv()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=resolveai_tickets_export.csv"}
    )
