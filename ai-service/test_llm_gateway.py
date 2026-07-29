import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
sys.path.append(os.path.dirname(__file__))

from app.services.llm_gateway import generate_chatbot_answer

class TestLLMGatewayDirect(unittest.TestCase):
    def setUp(self):
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
    def test_direct_openai_flow(self, mock_post):
        # Configure test environment
        os.environ["AI_PROVIDER"] = "OPENAI"
        os.environ["AI_API_KEY"] = "sk-mock-key-999"
        os.environ["LLM_MODEL_NAME"] = "gpt-3.5-turbo"
        
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

        # Call generate_chatbot_answer
        ans = generate_chatbot_answer(
            query="What is the meaning of aptitude?",
            history=[],
            context_chunks=[],
            intent="GENERAL_CONVERSATION",
            conversation_id=1
        )
        
        # Verify
        self.assertIn("Aptitude refers to a person's natural ability", ans)
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_headers = mock_post.call_args[1]["headers"]
        called_json = mock_post.call_args[1]["json"]
        
        self.assertEqual(called_url, "https://api.openai.com/v1/chat/completions")
        self.assertEqual(called_headers["Authorization"], "Bearer sk-mock-key-999")
        self.assertEqual(called_json["model"], "gpt-3.5-turbo")
        
        print("\n=== DIRECT LLM GATEWAY TEST SUCCESS ===")
        print(f"URL called: {called_url}")
        print(f"Authorization: {called_headers['Authorization']}")
        print(f"Model: {called_json['model']}")
        print(f"Answer: {ans}")
        print("=======================================\n")

if __name__ == "__main__":
    unittest.main()
