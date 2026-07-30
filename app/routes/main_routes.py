from flask import Blueprint, render_template, request, flash, redirect, url_for
from app.middleware.auth_middleware import get_current_user_from_jwt

main_bp = Blueprint('main', __name__)

@main_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@main_bp.route('/')
def home():
    return render_template('landing/index.html')

@main_bp.route('/about')
def about():
    return render_template('landing/about.html')

@main_bp.route('/services')
def services():
    return render_template('landing/services.html')

@main_bp.route('/features')
def features():
    return render_template('landing/features.html')

@main_bp.route('/pricing')
def pricing():
    return render_template('landing/pricing.html')

@main_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')
        flash(f"Thank you {name}! Your message has been received. Our team will follow up via {email}.", "success")
        return redirect(url_for('main.contact'))
    return render_template('landing/contact.html')
