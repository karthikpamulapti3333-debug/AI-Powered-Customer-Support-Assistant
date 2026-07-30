from functools import wraps
from flask import jsonify, redirect, url_for, request, flash, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt, decode_token, current_user as jwt_user
from app.models.user import User

def get_current_user_from_jwt():
    if hasattr(g, 'current_user') and g.current_user:
        return g.current_user
    try:
        verify_jwt_in_request(optional=True, locations=['headers', 'cookies'])
        if jwt_user:
            g.current_user = jwt_user
            return jwt_user
        identity = get_jwt_identity()
        if identity:
            user_id = identity.get("id") if isinstance(identity, dict) else identity
            user = User.query.get(int(user_id))
            if user:
                g.current_user = user
                return user
    except Exception:
        pass

    # Direct Bearer Header Fallback
    auth_header = request.headers.get('Authorization') if request else None
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            decoded = decode_token(token)
            identity = decoded.get("sub")
            user_id = identity.get("id") if isinstance(identity, dict) else identity
            user = User.query.get(int(user_id))
            if user:
                g.current_user = user
                return user
        except Exception:
            pass

    return None

def admin_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                role = claims.get("role") or (get_jwt_identity().get("role") if isinstance(get_jwt_identity(), dict) else None)
                if role != "ADMIN":
                    if request.is_json or request.path.startswith("/api/"):
                        return jsonify({"error": "Admin privilege required"}), 403
                    flash("Access denied. Admin privileges required.", "danger")
                    return redirect(url_for("auth.login"))
            except Exception as e:
                if request.is_json or request.path.startswith("/api/"):
                    return jsonify({"error": "Authentication required", "details": str(e)}), 401
                flash("Please log in to continue.", "warning")
                return redirect(url_for("auth.login"))
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def customer_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                if request.is_json or request.path.startswith("/api/"):
                    return jsonify({"error": "Authentication required", "details": str(e)}), 401
                flash("Please log in to access your portal.", "warning")
                return redirect(url_for("auth.login"))
            return fn(*args, **kwargs)
        return wrapper
    return decorator
