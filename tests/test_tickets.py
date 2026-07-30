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

    def test_guest_ticket_creation_and_admin_reply(self):
        # 1. Guest creates ticket without logging in
        create_res = self.client.post('/tickets/new', json={
            "name": "Jane Guest",
            "email": "jane@example.com",
            "phone": "+1555123456",
            "subject": "Billing issue with monthly subscription",
            "description": "I was charged twice on my invoice.",
            "category": "BILLING",
            "priority": "HIGH"
        })
        self.assertEqual(create_res.status_code, 201)
        ticket_data = create_res.get_json()
        self.assertIn("ticketCode", ticket_data)
        ticket_id = ticket_data["ticket"]["id"]

        # 2. Login as Admin
        admin_login = self.client.post('/admin/login', json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        token = admin_login.get_json()["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # 3. Admin posts reply
        reply_res = self.client.post(f'/tickets/{ticket_id}/reply', json={
            "message": "We have refunded the duplicate charge. Thanks for notifying us."
        }, headers=headers)
        self.assertEqual(reply_res.status_code, 201)

        # 4. Admin updates status to RESOLVED
        status_res = self.client.put(f'/tickets/{ticket_id}/status', json={
            "status": "RESOLVED"
        }, headers=headers)
        self.assertEqual(status_res.status_code, 200)

if __name__ == '__main__':
    unittest.main()
