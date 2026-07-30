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
        res = self.client.post('/admin/login', json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "ADMIN")

    def test_admin_login_invalid_password(self):
        res = self.client.post('/admin/login', json={
            "email": "admin@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 401)

if __name__ == '__main__':
    unittest.main()
