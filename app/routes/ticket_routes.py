from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.ticket import Ticket, TicketReply
from app.models.user import User
from app.models.notification import Notification
from app.extensions import db
from app.middleware.auth_middleware import get_current_user_from_jwt, customer_required, admin_required

ticket_bp = Blueprint('tickets', __name__)

@ticket_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@ticket_bp.route('/', methods=['GET'])
def list_tickets():
    user = get_current_user_from_jwt()
    if not user:
        flash("Please log in to view tickets.", "warning")
        return redirect(url_for('auth.login'))

    if user.role == 'ADMIN':
        status_filter = request.args.get('status')
        query = Ticket.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        tickets = query.order_by(Ticket.created_at.desc()).all()
        return render_template('admin/tickets.html', tickets=tickets)
    else:
        tickets = Ticket.query.filter_by(customer_id=user.id).order_by(Ticket.created_at.desc()).all()
        return render_template('customer/tickets.html', tickets=tickets)

@ticket_bp.route('/new', methods=['GET', 'POST'])
def create_ticket():
    user = get_current_user_from_jwt()
    if not user:
        flash("Please log in to submit a ticket.", "warning")
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        if request.is_json or (request.headers.get('Content-Type') and 'json' in request.headers.get('Content-Type')):
            data = request.get_json(silent=True) or {}
            subject = data.get('subject')
            description = data.get('description')
            category = data.get('category', 'GENERAL')
            priority = data.get('priority', 'MEDIUM')
        else:
            subject = request.form.get('subject')
            description = request.form.get('description')
            category = request.form.get('category', 'GENERAL')
            priority = request.form.get('priority', 'MEDIUM')

        if not subject or not description:
            msg = "Subject and Description are required."
            if request.is_json:
                return jsonify({"error": msg}), 400
            flash(msg, "danger")
            return render_template('customer/create_ticket.html')

        ticket = Ticket(
            ticket_code=Ticket.generate_code(),
            customer_id=user.id,
            customer_name=user.full_name,
            email=user.email,
            subject=subject,
            description=description,
            category=category,
            priority=priority,
            status='OPEN'
        )
        db.session.add(ticket)

        # Create Admin notification
        notif = Notification(
            user_id=1,  # Admin ID
            title=f"New Ticket {ticket.ticket_code}",
            message=f"Customer {user.full_name} submitted ticket: {subject}"
        )
        db.session.add(notif)
        db.session.commit()

        if request.is_json:
            return jsonify({"message": "Ticket created successfully", "ticket": ticket.to_dict()}), 201

        flash(f"Ticket {ticket.ticket_code} created successfully!", "success")
        return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

    return render_template('customer/create_ticket.html')

@ticket_bp.route('/<int:ticket_id>', methods=['GET'])
def view_ticket(ticket_id):
    user = get_current_user_from_jwt()
    if not user:
        flash("Please log in.", "warning")
        return redirect(url_for('auth.login'))

    ticket = Ticket.query.get_or_404(ticket_id)
    if user.role != 'ADMIN' and ticket.customer_id != user.id:
        flash("Access denied to requested ticket.", "danger")
        return redirect(url_for('tickets.list_tickets'))

    if request.is_json or request.headers.get('Accept') == 'application/json':
        return jsonify(ticket.to_dict()), 200

    template = 'admin/ticket_detail.html' if user.role == 'ADMIN' else 'customer/ticket_detail.html'
    return render_template(template, ticket=ticket)

@ticket_bp.route('/<int:ticket_id>/reply', methods=['POST'])
def reply_ticket(ticket_id):
    user = get_current_user_from_jwt()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    ticket = Ticket.query.get_or_404(ticket_id)
    if user.role != 'ADMIN' and ticket.customer_id != user.id:
        return jsonify({"error": "Unauthorized to reply to this ticket"}), 403

    if request.is_json:
        data = request.get_json()
        message = data.get('message', '').strip()
    else:
        message = request.form.get('message', '').strip()

    if not message:
        if request.is_json:
            return jsonify({"error": "Reply message cannot be empty"}), 400
        flash("Reply message cannot be empty.", "warning")
        return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

    reply = TicketReply(
        ticket_id=ticket.id,
        user_id=user.id,
        message=message
    )
    db.session.add(reply)

    # Auto-update status if Admin replies
    if user.role == 'ADMIN' and ticket.status == 'OPEN':
        ticket.status = 'IN_PROGRESS'

    # Notify Customer if Admin replied
    if user.role == 'ADMIN':
        notif = Notification(
            user_id=ticket.customer_id,
            title=f"Update on {ticket.ticket_code}",
            message=f"Support response added to your ticket: {ticket.subject}"
        )
        db.session.add(notif)

    db.session.commit()

    if request.is_json:
        return jsonify({"message": "Reply posted successfully", "reply": reply.to_dict()}), 201

    flash("Reply posted successfully!", "success")
    return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

@ticket_bp.route('/<int:ticket_id>/status', methods=['PUT', 'POST'])
def update_status(ticket_id):
    user = get_current_user_from_jwt()
    if not user or user.role != 'ADMIN':
        return jsonify({"error": "Admin privilege required"}), 403

    ticket = Ticket.query.get_or_404(ticket_id)
    if request.is_json:
        data = request.get_json()
        new_status = data.get('status')
    else:
        new_status = request.form.get('status')

    if new_status in ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']:
        ticket.status = new_status
        db.session.commit()
        if request.is_json:
            return jsonify({"message": "Status updated", "ticket": ticket.to_dict()}), 200
        flash(f"Ticket status updated to {new_status}.", "success")

    return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

@ticket_bp.route('/<int:ticket_id>/close', methods=['POST'])
def close_ticket(ticket_id):
    user = get_current_user_from_jwt()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    ticket = Ticket.query.get_or_404(ticket_id)
    if user.role != 'ADMIN' and ticket.customer_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    ticket.status = 'CLOSED'
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "Ticket closed successfully", "ticket": ticket.to_dict()}), 200

    flash("Ticket marked as CLOSED.", "info")
    return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

@ticket_bp.route('/<int:ticket_id>/delete', methods=['POST', 'DELETE'])
def delete_ticket(ticket_id):
    user = get_current_user_from_jwt()
    if not user or user.role != 'ADMIN':
        return jsonify({"error": "Admin privilege required"}), 403

    ticket = Ticket.query.get_or_404(ticket_id)
    db.session.delete(ticket)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "Ticket deleted successfully"}), 200

    flash("Ticket permanently deleted.", "success")
    return redirect(url_for('tickets.list_tickets'))
