from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, make_response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, unset_jwt_cookies, set_access_cookies
from app.models.user import User
from app.extensions import db
from app.middleware.auth_middleware import get_current_user_from_jwt

auth_bp = Blueprint('auth', __name__)

@auth_bp.context_processor
def inject_user():
    return dict(current_user=get_current_user_from_jwt())

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            username = data.get('username')
            password = data.get('password')
            first_name = data.get('firstName', '')
            last_name = data.get('lastName', '')
        else:
            email = request.form.get('email')
            username = request.form.get('username')
            password = request.form.get('password')
            first_name = request.form.get('first_name', '')
            last_name = request.form.get('last_name', '')

        if not email or not username or not password:
            msg = "Email, Username, and Password are required."
            if request.is_json:
                return jsonify({"error": msg}), 400
            flash(msg, "danger")
            return render_template('auth/register.html')

        if User.query.filter((User.email == email) | (User.username == username)).first():
            msg = "User with that email or username already exists."
            if request.is_json:
                return jsonify({"error": msg}), 400
            flash(msg, "danger")
            return render_template('auth/register.html')

        user = User(
            email=email.lower().strip(),
            username=username.lower().strip(),
            first_name=first_name,
            last_name=last_name,
            role="CUSTOMER"  # All registrations default to CUSTOMER
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        if request.is_json:
            token = create_access_token(identity=str(user.id), additional_claims={"email": user.email, "role": user.role})
            return jsonify({"message": "Registration successful", "user": user.to_dict(), "token": token}), 201

        flash("Registration successful! Please log in to continue.", "success")
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
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
            msg = "Please provide login credentials."
            if request.is_json:
                return jsonify({"error": msg}), 400
            flash(msg, "danger")
            return render_template('auth/login.html')

        login_clean = login_id.lower().strip()
        user = User.query.filter((User.email == login_clean) | (User.username == login_clean)).first()

        if not user or not user.check_password(password):
            msg = "Invalid username/email or password."
            if request.is_json:
                return jsonify({"error": msg}), 401
            flash(msg, "danger")
            return render_template('auth/login.html')

        token = create_access_token(identity=str(user.id), additional_claims={"email": user.email, "role": user.role})

        if request.is_json:
            res = make_response(jsonify({"message": "Login successful", "user": user.to_dict(), "token": token}))
            set_access_cookies(res, token)
            return res, 200

        target = url_for('admin.dashboard') if user.role == 'ADMIN' else url_for('customer.dashboard')
        res = make_response(redirect(target))
        set_access_cookies(res, token)
        flash(f"Welcome back, {user.full_name}!", "success")
        return res

    return render_template('auth/login.html')

@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    res = make_response(redirect(url_for('auth.login')))
    unset_jwt_cookies(res)
    flash("You have been logged out.", "info")
    return res

@auth_bp.route('/profile', methods=['GET', 'POST'])
@jwt_required()
def profile():
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity
    user = User.query.get_or_404(int(user_id))

    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            user.first_name = data.get('firstName', user.first_name)
            user.last_name = data.get('lastName', user.last_name)
            new_pwd = data.get('password')
        else:
            user.first_name = request.form.get('first_name', user.first_name)
            user.last_name = request.form.get('last_name', user.last_name)
            new_pwd = request.form.get('password')

        if new_pwd and len(new_pwd) >= 6:
            user.set_password(new_pwd)

        db.session.commit()

        if request.is_json:
            return jsonify({"message": "Profile updated successfully", "user": user.to_dict()}), 200

        flash("Profile updated successfully!", "success")
        return redirect(url_for('auth.profile'))

    if request.is_json:
        return jsonify({"user": user.to_dict()}), 200

    return render_template('customer/profile.html', user=user)
