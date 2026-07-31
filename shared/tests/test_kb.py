import unittest
from app import create_app, seed_database
from app.extensions import db

class KnowledgeBaseTestCase(unittest.TestCase):
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

    def test_kb_listing_and_admin_creation(self):
        # 1. Public List FAQs
        list_res = self.client.get('/kb/', headers={"Accept": "application/json"})
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(len(list_res.get_json()), 1)

        # 2. Login Admin via Flask-Login
        self.client.post('/admin/login', data={
            "login_id": "admin@example.com",
            "password": "admin123"
        })

        # 3. Admin Create FAQ
        create_res = self.client.post('/kb/create', json={
            "question": "How do I upgrade my plan?",
            "answer": "Go to billing settings and click upgrade.",
            "category": "ACCOUNT"
        })
        self.assertEqual(create_res.status_code, 201)

if __name__ == '__main__':
    unittest.main()
