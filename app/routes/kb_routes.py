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
    user = get_current_user_from_jwt()
    if user and user.role == 'ADMIN':
        faqs = KnowledgeBase.query.order_by(KnowledgeBase.created_at.desc()).all()
        if request.is_json:
            return jsonify([f.to_dict() for f in faqs]), 200
        return render_template('admin/kb.html', faqs=faqs)
    else:
        faqs = KnowledgeBase.query.filter_by(is_published=True).order_by(KnowledgeBase.created_at.desc()).all()
        return jsonify([f.to_dict() for f in faqs]), 200

@kb_bp.route('/', methods=['POST'])
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
        if request.is_json:
            return jsonify({"error": "Question and Answer are required"}), 400
        flash("Question and Answer are required.", "danger")
        return redirect(url_for('kb.list_faqs'))

    faq = KnowledgeBase(
        question=question,
        answer=answer,
        category=category,
        is_published=True
    )
    db.session.add(faq)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "FAQ created successfully", "faq": faq.to_dict()}), 201

    flash("FAQ item created successfully!", "success")
    return redirect(url_for('kb.list_faqs'))

@kb_bp.route('/<int:faq_id>', methods=['PUT', 'POST'])
@admin_required()
def update_faq(faq_id):
    faq = KnowledgeBase.query.get_or_404(faq_id)
    if request.is_json:
        data = request.get_json()
        faq.question = data.get('question', faq.question)
        faq.answer = data.get('answer', faq.answer)
        faq.category = data.get('category', faq.category)
        faq.is_published = data.get('isPublished', faq.is_published)
    else:
        faq.question = request.form.get('question', faq.question)
        faq.answer = request.form.get('answer', faq.answer)
        faq.category = request.form.get('category', faq.category)
        faq.is_published = request.form.get('is_published') == 'on'

    db.session.commit()

    if request.is_json:
        return jsonify({"message": "FAQ updated successfully", "faq": faq.to_dict()}), 200

    flash("FAQ item updated successfully!", "success")
    return redirect(url_for('kb.list_faqs'))

@kb_bp.route('/<int:faq_id>/delete', methods=['POST', 'DELETE'])
@admin_required()
def delete_faq(faq_id):
    faq = KnowledgeBase.query.get_or_404(faq_id)
    db.session.delete(faq)
    db.session.commit()

    if request.is_json:
        return jsonify({"message": "FAQ deleted successfully"}), 200

    flash("FAQ item deleted.", "info")
    return redirect(url_for('kb.list_faqs'))
