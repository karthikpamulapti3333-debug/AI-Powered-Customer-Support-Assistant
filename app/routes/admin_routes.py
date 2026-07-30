from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, Response
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import func
from app.models.admin import Admin
from app.models.ticket import Ticket
from app.models.chat import ChatSession, Message
from app.models.knowledge import KnowledgeBase
from app.extensions import db
from app.services.exporter import export_tickets_csv

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.dashboard'))

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
        admin = Admin.query.filter((Admin.email == login_clean) | (Admin.username == login_clean)).first()

        if not admin or not admin.check_password(password):
            msg = "Invalid Admin credentials."
            if request.is_json:
                return jsonify({"error": msg}), 401
            flash(msg, "danger")
            return render_template('admin/login.html')

        login_user(admin, remember=True)

        if request.is_json:
            return jsonify({"message": "Admin login successful", "admin": admin.to_dict()}), 200

        flash("Welcome to Admin Console!", "success")
        return redirect(url_for('admin.dashboard'))

    return render_template('admin/login.html')

@admin_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    logout_user()
    flash("Logged out successfully.", "info")
    return redirect(url_for('admin.login'))

@admin_bp.route('/dashboard')
@login_required
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
@login_required
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
@login_required
def list_users():
    admins = Admin.query.all()
    if request.is_json or request.args.get('format') == 'json':
        return jsonify([a.to_dict() for a in admins]), 200
    return render_template('admin/users.html', users=admins)

@admin_bp.route('/export/tickets')
@login_required
def export_tickets():
    csv_data = export_tickets_csv()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=resolveai_tickets_report.csv"}
    )
