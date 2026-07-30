from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.models.knowledge import KnowledgeBase
from app.extensions import db
from app.middleware.auth_middleware import get_current_user_from_jwt, admin_required

kb_bp = Blueprint('kb', __name__)

@kb_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@kb_bp.route('/', methods=['GET'])
def list_faqs():
    faqs = KnowledgeBase.query.order_by(KnowledgeBase.created_at.desc()).all()
    if request.is_json or request.headers.get('Accept') == 'application/json':
        return jsonify([f.to_dict() for f in faqs]), 200
    return render_template('admin/kb.html', faqs=faqs)

@kb_bp.route('/create', methods=['POST'])
@admin_required()
def create_faq():
    if request.is_json:
        data = request.get_json()
        question = data.get('question')
        answer = data.get('answer')
        category = data.get('category', 'GENERAL')
    else:
        question = request.form.get('question')
        answer = request.form.get('answer')
        category = request.form.get('category', 'GENERAL')

    if not question or not answer:
        msg = "Question and Answer fields are required."
        if request.is_json:
            return jsonify({"error": msg}), 400
        flash(msg, "danger")
        return redirect(url_for('kb.list_faqs'))

    faq = KnowledgeBase(
        question=question.strip(),
        answer=answer.strip(),
        category=category,
        is_published=True
    )
    db.session.add(faq)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "FAQ published successfully", "faq": faq.to_dict()}), 201

    flash("FAQ published to Knowledge Base!", "success")
    return redirect(url_for('kb.list_faqs'))

@kb_bp.route('/<int:faq_id>/delete', methods=['POST', 'DELETE'])
@admin_required()
def delete_faq(faq_id):
    faq = KnowledgeBase.query.get_or_404(faq_id)
    db.session.delete(faq)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "FAQ deleted successfully"}), 200

    flash("FAQ removed from Knowledge Base.", "info")
    return redirect(url_for('kb.list_faqs'))
