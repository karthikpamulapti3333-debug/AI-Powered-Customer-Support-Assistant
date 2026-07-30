import unittest
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.ticket import Ticket

class TicketTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        from app import seed_database
        seed_database()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_ticket_creation_and_reply(self):
        # 1. Login as seeded Customer
        login_res = self.client.post('/auth/login', json={
            "email": "customer@example.com",
            "password": "customer123"
        })
        token = login_res.get_json()["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        # 2. Create Ticket via REST API
        create_res = self.client.post('/api/tickets', json={
            "subject": "Billing issue with monthly plan",
            "description": "I was charged twice on my card.",
            "category": "BILLING",
            "priority": "HIGH"
        }, headers=headers)
        self.assertEqual(create_res.status_code, 201)
        ticket_id = create_res.get_json()["ticket"]["id"]

        # 3. Post Reply
        reply_res = self.client.post(f'/tickets/{ticket_id}/reply', json={
            "message": "Adding additional transaction ID info: TXN-998877"
        }, headers=headers)
        self.assertEqual(reply_res.status_code, 201)

        # 4. Fetch Ticket Detail
        view_res = self.client.get(f'/tickets/{ticket_id}', headers=headers)
        self.assertEqual(view_res.status_code, 200)
        self.assertEqual(len(view_res.get_json()["replies"]), 1)

if __name__ == '__main__':
    unittest.main()
