import os
import requests
import json
from flask import current_app
from app.models.knowledge import KnowledgeBase

class LLMClient:
    def __init__(self):
        pass

    def _search_knowledge_base(self, user_query: str) -> str:
        """Search published FAQs for matching answers before querying LLM"""
        try:
            faqs = KnowledgeBase.query.filter_by(is_published=True).all()
            query_terms = [t.lower() for t in user_query.split() if len(t) > 2]
            
            best_match = None
            max_hits = 0
            for faq in faqs:
                text = f"{faq.question} {faq.answer}".lower()
                hits = sum(1 for term in query_terms if term in text)
                if hits > max_hits:
                    max_hits = hits
                    best_match = faq

            if best_match and max_hits >= 2:
                return f"**Knowledge Base Match:**\n\n{best_match.answer}\n\n*Related Topic: {best_match.question}*"
        except Exception as e:
            print(f"[KB Search Exception] {e}")
        return None

    def generate_response(self, user_message: str, history: list = None) -> dict:
        """Generate response using configured provider with KB fallback"""
        kb_match = self._search_knowledge_base(user_message)
        if kb_match:
            return {
                "response": kb_match,
                "confidence": 0.95,
                "source": "KNOWLEDGE_BASE"
            }

        provider = current_app.config.get("AI_PROVIDER", "LOCAL_SIMULATOR").upper()
        api_key = current_app.config.get("AI_API_KEY", "")
        base_url = current_app.config.get("AI_BASE_URL", "https://api.openai.com/v1")
        model_name = current_app.config.get("LLM_MODEL_NAME", "gpt-3.5-turbo")

        if provider == "OPENAI" and api_key:
            return self._call_openai(user_message, history, api_key, base_url, model_name)
        elif provider == "GEMINI" and api_key:
            return self._call_gemini(user_message, history, api_key)
        elif provider == "OLLAMA":
            return self._call_ollama(user_message, history, base_url, model_name)
        else:
            return self._local_intelligent_fallback(user_message)

    def _call_openai(self, prompt, history, api_key, base_url, model):
        try:
            messages = [{"role": "system", "content": "You are a helpful, empathetic AI Customer Support Assistant for an enterprise platform."}]
            if history:
                for h in history[-6:]:
                    role = "user" if h.get("sender") == "USER" else "assistant"
                    messages.append({"role": role, "content": h.get("content", "")})
            messages.append({"role": "user", "content": prompt})

            res = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "temperature": 0.7, "max_tokens": 500},
                timeout=12
            )
            if res.status_code == 200:
                data = res.json()
                text = data["choices"][0]["message"]["content"]
                return {"response": text, "confidence": 0.92, "source": "OPENAI"}
        except Exception as e:
            print(f"[OpenAI API Error] {e}")
        return self._local_intelligent_fallback(prompt)

    def _call_gemini(self, prompt, history, api_key):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
            res = requests.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                headers={"Content-Type": "application/json"},
                timeout=12
            )
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {"response": text, "confidence": 0.90, "source": "GEMINI"}
        except Exception as e:
            print(f"[Gemini API Error] {e}")
        return self._local_intelligent_fallback(prompt)

    def _call_ollama(self, prompt, history, base_url, model):
        try:
            url = f"{base_url.rstrip('/')}/api/generate"
            res = requests.post(
                url,
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=10
            )
            if res.status_code == 200:
                data = res.json()
                return {"response": data.get("response", ""), "confidence": 0.88, "source": "OLLAMA"}
        except Exception as e:
            print(f"[Ollama Error] {e}")
        return self._local_intelligent_fallback(prompt)

    def _local_intelligent_fallback(self, prompt: str) -> dict:
        q = prompt.lower()
        if any(w in q for w in ["hello", "hi", "hey", "greetings"]):
            res = "Hello! 👋 Welcome to **ResolveAI Support**. How can I assist you today?"
            conf = 0.95
        elif any(w in q for w in ["pricing", "cost", "plan", "subscription", "price"]):
            res = "We offer flexible plans:\n- **Starter**: $29/mo\n- **Pro**: $79/mo (Unlimited Chat & SLA Automation)\n- **Enterprise**: Custom volume pricing."
            conf = 0.90
        elif any(w in q for w in ["refund", "billing", "charge", "payment"]):
            res = "For billing inquiries or refund status, requests are processed within **3-5 business days**."
            conf = 0.85
        elif any(w in q for w in ["broken", "error", "bug", "fail", "not working", "issue"]):
            res = "I couldn't fully resolve your issue automatically."
            conf = 0.40  # Low confidence triggers ticket modal recommendation
        else:
            res = "Thank you for reaching out! I've analyzed your query."
            conf = 0.70

        return {
            "response": res,
            "confidence": conf,
            "source": "INTELLIGENT_SIMULATOR"
        }

llm_client = LLMClient()
