import unittest
from app import create_app
from app.extensions import db
from app.ai.intent_detector import IntentDetector

class ChatTestCase(unittest.TestCase):
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

    def test_intent_detection(self):
        intent = IntentDetector.detect_intent("I need a refund for my billing invoice")
        self.assertEqual(intent, "BILLING")

        intent_tech = IntentDetector.detect_intent("The app crashed with an error code")
        self.assertEqual(intent_tech, "TECHNICAL")

    def test_chat_message_endpoint(self):
        res = self.client.post('/chat/message', json={
            "message": "Hello, how do I reset my password?",
            "sessionId": "test-session-123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("aiResponse", data)
        self.assertEqual(data["sessionId"], "test-session-123")

if __name__ == '__main__':
    unittest.main()
