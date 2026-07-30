from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, make_response, Response
from flask_jwt_extended import create_access_token, unset_jwt_cookies, set_access_cookies
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

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            login_id = data.get('email') or data.get('username')
            password = data.get('password')
        else:
            login_id = request.form.get('login_id')
            password = request.form.get('password')

        if not login_id or not password:
            msg = "Credentials required."
            if request.is_json:
                return jsonify({"error": msg}), 400
            flash(msg, "danger")
            return render_template('admin/login.html')

        login_clean = login_id.lower().strip()
        user = User.query.filter((User.email == login_clean) | (User.username == login_clean)).first()

        if not user or user.role != 'ADMIN' or not user.check_password(password):
            msg = "Invalid Admin credentials or access denied."
            if request.is_json:
                return jsonify({"error": msg}), 401
            flash(msg, "danger")
            return render_template('admin/login.html')

        token = create_access_token(identity=str(user.id), additional_claims={"email": user.email, "role": user.role})

        if request.is_json:
            res = make_response(jsonify({"message": "Admin login successful", "token": token, "user": user.to_dict()}))
            set_access_cookies(res, token)
            return res, 200

        res = make_response(redirect(url_for('admin.dashboard')))
        set_access_cookies(res, token)
        flash("Welcome to Admin Management Console!", "success")
        return res

    return render_template('admin/login.html')

@admin_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    res = make_response(redirect(url_for('admin.login')))
    unset_jwt_cookies(res)
    flash("Admin logged out successfully.", "info")
    return res

@admin_bp.route('/dashboard')
@admin_required()
def dashboard():
    total_tickets = Ticket.query.count()
    open_tickets = Ticket.query.filter(Ticket.status.in_(['OPEN', 'PENDING', 'IN_PROGRESS'])).count()
    closed_tickets = Ticket.query.filter(Ticket.status.in_(['RESOLVED', 'CLOSED'])).count()
    ai_conversations = ChatSession.query.count()
    total_messages = Message.query.count()

    recent_tickets = Ticket.query.order_by(Ticket.created_at.desc()).limit(6).all()
    recent_sessions = ChatSession.query.order_by(ChatSession.updated_at.desc()).limit(5).all()

    return render_template(
        'admin/dashboard.html',
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        closed_tickets=closed_tickets,
        ai_conversations=ai_conversations,
        total_messages=total_messages,
        recent_tickets=recent_tickets,
        recent_sessions=recent_sessions
    )

@admin_bp.route('/analytics')
@admin_required()
def analytics():
    status_counts = db.session.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    status_data = {status: count for status, count in status_counts}

    cat_counts = db.session.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all()
    category_data = {cat: count for cat, count in cat_counts}

    chat_counts = db.session.query(func.date(Message.timestamp), func.count(Message.id)).group_by(func.date(Message.timestamp)).limit(7).all()
    chat_data = {str(date): count for date, count in chat_counts}

    if request.is_json or request.args.get('format') == 'json':
        return jsonify({
            "statusData": status_data,
            "categoryData": category_data,
            "chatData": chat_data
        }), 200

    return render_template('admin/analytics.html', status_data=status_data, category_data=category_data, chat_data=chat_data)

@admin_bp.route('/users')
@admin_required()
def list_users():
    users = User.query.filter_by(role='ADMIN').all()
    if request.is_json or request.args.get('format') == 'json':
        return jsonify([u.to_dict() for u in users]), 200
    return render_template('admin/users.html', users=users)

@admin_bp.route('/export/tickets')
@admin_required()
def export_tickets():
    csv_data = export_tickets_csv()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=resolveai_tickets_report.csv"}
    )
