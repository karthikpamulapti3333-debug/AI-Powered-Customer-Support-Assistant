import os
from flask import Flask, render_template, jsonify
from config import config_by_name
from app.extensions import db, jwt, migrate, cors

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name.get(config_name, config_by_name["development"]))

    # Ensure instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)

    # JWT Token in Cookies/Headers User Identity Loader
    from app.models.user import User
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        user_id = identity.get("id") if isinstance(identity, dict) else identity
        return User.query.get(int(user_id))

    # Register Blueprints
    from app.routes.main_routes import main_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.chat_routes import chat_bp
    from app.routes.ticket_routes import ticket_bp
    from app.routes.customer_routes import customer_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.kb_routes import kb_bp
    from app.routes.api_routes import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(chat_bp, url_prefix='/chat')
    app.register_blueprint(ticket_bp, url_prefix='/tickets')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(kb_bp, url_prefix='/kb')
    app.register_blueprint(api_bp, url_prefix='/api')

    # Register Error Handlers
    register_error_handlers(app)

    # Shell context & DB auto-seeding
    with app.app_context():
        db.create_all()
        seed_database()

    return app

def register_error_handlers(app):
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(401)
    def unauthorized(e):
        return render_template('errors/401.html'), 401

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/500.html'), 500

def seed_database():
    from app.models.user import User
    from app.models.knowledge import KnowledgeBase

    # Seed Admin User
    admin = User.query.filter_by(email="admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            username="admin",
            first_name="System",
            last_name="Admin",
            role="ADMIN"
        )
        admin.set_password("admin123")
        db.session.add(admin)

    # Seed Customer User
    customer = User.query.filter_by(email="customer@example.com").first()
    if not customer:
        customer = User(
            email="customer@example.com",
            username="customer",
            first_name="Jane",
            last_name="Doe",
            role="CUSTOMER"
        )
        customer.set_password("customer123")
        db.session.add(customer)

    # Seed FAQs Knowledge Base
    if KnowledgeBase.query.count() == 0:
        faqs = [
            KnowledgeBase(
                question="How do I reset my account password?",
                answer="Go to the Login page and click 'Forgot Password'. Follow the email verification link to enter a new password.",
                category="ACCOUNT"
            ),
            KnowledgeBase(
                question="What payment methods do you accept?",
                answer="We support all major credit cards (Visa, MasterCard, Amex), PayPal, and direct ACH bank transfers for Enterprise subscriptions.",
                category="BILLING"
            ),
            KnowledgeBase(
                question="How do I create a new support ticket?",
                answer="From your Customer Dashboard, click the 'Create Ticket' button, select a category and priority, fill out the details, and hit Submit.",
                category="SUPPORT"
            )
        ]
        db.session.add_all(faqs)

    db.session.commit()
