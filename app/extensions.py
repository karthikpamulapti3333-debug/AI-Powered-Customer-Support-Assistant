from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS

db = SQLAlchemy()
login_manager = LoginManager()
cors = CORS()

login_manager.login_view = 'admin.login'
login_manager.login_message_category = 'warning'
login_manager.login_message = 'Please log in as an administrator to access this page.'
