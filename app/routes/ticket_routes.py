from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.models.ticket import Ticket, TicketReply
from app.models.admin import Admin
from app.extensions import db

ticket_bp = Blueprint('tickets', __name__)

@ticket_bp.route('/new', methods=['POST'])
def create_ticket():
    """Guest ticket submission endpoint - No login required"""
    if request.is_json or (request.headers.get('Content-Type') and 'json' in request.headers.get('Content-Type')):
        data = request.get_json(silent=True) or {}
        name = data.get('name') or data.get('customerName')
        email = data.get('email')
        phone = data.get('phone', '')
        subject = data.get('subject')
        description = data.get('description')
        category = data.get('category', 'GENERAL')
        priority = data.get('priority', 'MEDIUM')
    else:
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone', '')
        subject = request.form.get('subject')
        description = request.form.get('description')
        category = request.form.get('category', 'GENERAL')
        priority = request.form.get('priority', 'MEDIUM')

    if not name or not email or not subject or not description:
        msg = "Name, Email, Subject, and Description are required."
        if request.is_json:
            return jsonify({"error": msg}), 400
        flash(msg, "danger")
        return redirect(url_for('main.home'))

    ticket = Ticket(
        ticket_code=Ticket.generate_code(),
        customer_name=name.strip(),
        email=email.strip().lower(),
        phone=phone.strip() if phone else None,
        subject=subject.strip(),
        description=description.strip(),
        category=category,
        priority=priority,
        status='OPEN'
    )
    db.session.add(ticket)
    db.session.commit()

    if request.is_json:
        return jsonify({
            "message": "Support ticket created successfully",
            "ticketCode": ticket.ticket_code,
            "ticket": ticket.to_dict()
        }), 201

    flash(f"Ticket submitted successfully! Your Ticket ID is: {ticket.ticket_code}", "success")
    return redirect(url_for('main.home'))

@ticket_bp.route('/', methods=['GET'])
@login_required
def list_tickets():
    status_filter = request.args.get('status')
    query = Ticket.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return render_template('admin/tickets.html', tickets=tickets)

@ticket_bp.route('/<int:ticket_id>', methods=['GET'])
@login_required
def view_ticket(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    if request.is_json or request.headers.get('Accept') == 'application/json':
        return jsonify(ticket.to_dict()), 200
    return render_template('admin/ticket_detail.html', ticket=ticket)

@ticket_bp.route('/<int:ticket_id>/reply', methods=['POST'])
@login_required
def reply_ticket(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)

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
        admin_id=current_user.id if current_user.is_authenticated else None,
        message=message
    )
    db.session.add(reply)

    if ticket.status == 'OPEN':
        ticket.status = 'IN_PROGRESS'

    db.session.commit()

    if request.is_json:
        return jsonify({"message": "Reply posted successfully", "reply": reply.to_dict()}), 201

    flash("Admin reply posted successfully!", "success")
    return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

@ticket_bp.route('/<int:ticket_id>/status', methods=['PUT', 'POST'])
@login_required
def update_status(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    if request.is_json:
        data = request.get_json()
        new_status = data.get('status')
    else:
        new_status = request.form.get('status')

    if new_status in ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']:
        ticket.status = new_status
        db.session.commit()
        if request.is_json:
            return jsonify({"message": "Status updated", "ticket": ticket.to_dict()}), 200
        flash(f"Ticket status updated to {new_status}.", "success")

    return redirect(url_for('tickets.view_ticket', ticket_id=ticket.id))

@ticket_bp.route('/<int:ticket_id>/delete', methods=['POST', 'DELETE'])
@login_required
def delete_ticket(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    db.session.delete(ticket)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "Ticket deleted successfully"}), 200

    flash("Ticket permanently deleted.", "info")
    return redirect(url_for('tickets.list_tickets'))
