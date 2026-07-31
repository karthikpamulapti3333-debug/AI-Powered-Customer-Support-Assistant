import unittest
from app import create_app, seed_database
from app.extensions import db

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        seed_database()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_admin_login_success(self):
        res = self.client.post('/admin/login', data={
            "login_id": "admin@example.com",
            "password": "admin123"
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        # Check protected dashboard access after session login
        dash_res = self.client.get('/admin/dashboard')
        self.assertEqual(dash_res.status_code, 200)

    def test_admin_login_invalid_password(self):
        res = self.client.post('/admin/login', data={
            "login_id": "admin@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 200) # Re-renders login form with flash

    def test_unauthorized_dashboard_redirect(self):
        res = self.client.get('/admin/dashboard')
        self.assertEqual(res.status_code, 302) # Redirects to /admin/login

if __name__ == '__main__':
    unittest.main()
