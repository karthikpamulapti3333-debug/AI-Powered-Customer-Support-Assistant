import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
sys.path.append(os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

class TestLLMFlow(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Backup environment
        self.old_provider = os.environ.get("AI_PROVIDER")
        self.old_key = os.environ.get("AI_API_KEY")
        self.old_model = os.environ.get("LLM_MODEL_NAME")
        
    def tearDown(self):
        # Restore environment
        if self.old_provider:
            os.environ["AI_PROVIDER"] = self.old_provider
        else:
            os.environ.pop("AI_PROVIDER", None)
        if self.old_key:
            os.environ["AI_API_KEY"] = self.old_key
        else:
            os.environ.pop("AI_API_KEY", None)
        if self.old_model:
            os.environ["LLM_MODEL_NAME"] = self.old_model
        else:
            os.environ.pop("LLM_MODEL_NAME", None)

    @patch("requests.post")
    def test_general_conversation_real_llm_flow(self, mock_post):
        # Configure env variables to target real OpenAI
        os.environ["AI_PROVIDER"] = "OPENAI"
        os.environ["AI_API_KEY"] = "sk-mock-key-12345"
        os.environ["LLM_MODEL_NAME"] = "gpt-3.5-turbo"
        
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Aptitude refers to a person's natural ability or potential to learn and perform well in a particular area. For example, someone may have an aptitude for mathematics, programming, language, or mechanical reasoning."
                }
            }]
        }
        mock_post.return_value = mock_response

        # Request payload
        payload = {
            "query": "What is the meaning of aptitude?",
            "history": [],
            "conversationId": 1
        }
        
        headers = {
            "Authorization": "Bearer mock-jwt-token"
        }
        
        # Call the endpoint
        response = self.client.post("/api/ai/chat", json=payload, headers=headers)
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertEqual(json_data["intent"], "GENERAL_CONVERSATION")
        self.assertIn("Aptitude refers to a person's natural ability", json_data["answer"])
        
        # Verify that requests.post was called with the OpenAI completions URL and Auth Header
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_headers = mock_post.call_args[1]["headers"]
        called_json = mock_post.call_args[1]["json"]
        
        self.assertEqual(called_url, "https://api.openai.com/v1/chat/completions")
        self.assertEqual(called_headers["Authorization"], "Bearer sk-mock-key-12345")
        self.assertEqual(called_json["model"], "gpt-3.5-turbo")
        self.assertIn("User Query: What is the meaning of aptitude?", called_json["messages"][1]["content"])
        
        print("\n=== INTEGRATION TEST VERIFICATION SUCCESS ===")
        print(f"Request: {payload['query']}")
        print(f"Intent: {json_data['intent']}")
        print(f"LLM Call: {called_url}")
        print(f"Auth Header: {called_headers['Authorization']}")
        print(f"Model: {called_json['model']}")
        print(f"Response: {json_data['answer']}")
        print("============================================\n")

if __name__ == "__main__":
    unittest.main()
