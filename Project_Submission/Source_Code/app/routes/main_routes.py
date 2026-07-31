import uuid
from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from app.models.knowledge import KnowledgeBase

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    session_id = request.args.get('session_id') or str(uuid.uuid4())
    faqs = KnowledgeBase.query.filter_by(is_published=True).limit(4).all()
    return render_template('index.html', session_id=session_id, faqs=faqs)


@main_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')
        flash(f"Thank you {name}! Your inquiry has been received.", "success")
        return redirect(url_for('main.home'))
    return redirect(url_for('main.home'))
