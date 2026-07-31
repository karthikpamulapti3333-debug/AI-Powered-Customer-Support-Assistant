import unittest
from app import create_app, seed_database
from app.extensions import db

class TicketTestCase(unittest.TestCase):
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

    def test_guest_ticket_creation_and_admin_management(self):
        # 1. Guest submits ticket
        create_res = self.client.post('/tickets/new', json={
            "name": "Alex Guest",
            "email": "alex@example.com",
            "phone": "+1555987654",
            "subject": "Need help with API key setup",
            "description": "How do I generate an enterprise API key?",
            "category": "TECHNICAL",
            "priority": "HIGH"
        })
        self.assertEqual(create_res.status_code, 201)
        ticket_data = create_res.get_json()
        self.assertIn("ticketCode", ticket_data)
        ticket_id = ticket_data["ticket"]["id"]

        # 2. Login as Admin
        login_res = self.client.post('/admin/login', data={
            "login_id": "admin@example.com",
            "password": "admin123"
        }, follow_redirects=True)
        self.assertEqual(login_res.status_code, 200)

        # 3. Admin views ticket detail
        view_res = self.client.get(f'/tickets/{ticket_id}')
        self.assertEqual(view_res.status_code, 200)

        # 4. Admin posts reply
        reply_res = self.client.post(f'/tickets/{ticket_id}/reply', data={
            "message": "API keys can be generated from the integration tab."
        }, follow_redirects=True)
        self.assertEqual(reply_res.status_code, 200)

if __name__ == '__main__':
    unittest.main()
