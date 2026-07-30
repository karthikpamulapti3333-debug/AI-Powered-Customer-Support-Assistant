import unittest
from app import create_app
from app.extensions import db
from app.models.user import User

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_registration(self):
        res = self.client.post('/auth/register', json={
            "email": "newcustomer@example.com",
            "username": "newcustomer",
            "password": "password123",
            "firstName": "John",
            "lastName": "Smith"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "newcustomer@example.com")

    def test_login_success(self):
        res = self.client.post('/auth/login', json={
            "email": "customer@example.com",
            "password": "customer123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("token", data)

    def test_login_invalid_password(self):
        res = self.client.post('/auth/login', json={
            "email": "customer@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 401)

if __name__ == '__main__':
    unittest.main()
