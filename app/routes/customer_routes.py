from flask import Blueprint, render_template, redirect, url_for, flash, jsonify
from app.models.ticket import Ticket
from app.models.chat import ChatSession
from app.models.notification import Notification
from app.middleware.auth_middleware import get_current_user_from_jwt

customer_bp = Blueprint('customer', __name__)

@customer_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@customer_bp.route('/dashboard')
def dashboard():
    user = get_current_user_from_jwt()
    if not user:
        flash("Please log in to view your dashboard.", "warning")
        return redirect(url_for('auth.login'))

    active_tickets = Ticket.query.filter_by(customer_id=user.id).filter(Ticket.status.in_(['OPEN', 'PENDING', 'IN_PROGRESS'])).order_by(Ticket.updated_at.desc()).all()
    resolved_tickets = Ticket.query.filter_by(customer_id=user.id).filter(Ticket.status.in_(['RESOLVED', 'CLOSED'])).all()
    recent_chats = ChatSession.query.filter_by(user_id=user.id).order_by(ChatSession.updated_at.desc()).limit(5).all()
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(5).all()

    return render_template(
        'customer/dashboard.html',
        user=user,
        active_tickets=active_tickets,
        resolved_count=len(resolved_tickets),
        recent_chats=recent_chats,
        notifications=notifications
    )

@customer_bp.route('/notifications')
def notifications():
    user = get_current_user_from_jwt()
    if not user:
        return redirect(url_for('auth.login'))

    user_notifs = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).all()
    return render_template('customer/notifications.html', notifications=user_notifs)
