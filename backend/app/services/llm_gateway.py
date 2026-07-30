import requests
from app.config.settings import settings

class LLMGateway:
    def generate_chat_response(self, query: str, chat_history: list, context_chunks: list) -> dict:
        """
        Generates a RAG-infused support response.
        """
        context_text = "\n\n".join([f"Source: {c['file_name']}\nContent: {c['text']}" for c in context_chunks])
        
        # If API key is available, attempt real LLM API call
        if settings.AI_PROVIDER != "LOCAL_SIMULATOR" and settings.AI_API_KEY:
            try:
                headers = {"Authorization": f"Bearer {settings.AI_API_KEY}", "Content-Type": "application/json"}
                messages = [
                    {"role": "system", "content": f"You are ResolveAI, an agentic customer support bot. Help the customer. Use the following context retrieved from our knowledge base if relevant:\n{context_text}"}
                ]
                for msg in chat_history[-6:]:
                    messages.append({"role": msg["role"], "content": msg["text"]})
                messages.append({"role": "user", "content": query})
                
                payload = {
                    "model": settings.LLM_MODEL_NAME,
                    "messages": messages,
                    "temperature": 0.3
                }
                
                res = requests.post(f"{settings.AI_BASE_URL}/chat/completions", json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    answer = res.json()["choices"][0]["message"]["content"]
                    return {"response": answer, "sources": [c["file_name"] for c in context_chunks]}
            except Exception as e:
                print(f"Error calling LLM provider: {e}. Falling back to simulator.")

        # Local simulator fallback
        simulated_response = self._simulate_chat_response(query, context_chunks)
        return {
            "response": simulated_response,
            "sources": list(set([c["file_name"] for c in context_chunks]))
        }

    def generate_copilot_suggestions(self, title: str, description: str, chat_history: list, resolved_solutions: list) -> dict:
        """
        Generates a playbook dashboard suggestion for agents handling tickets.
        """
        solution_context = ""
        if resolved_solutions:
            sol = resolved_solutions[0]
            solution_context = f"Resolution Steps:\n{sol.resolution_steps}"

        if settings.AI_PROVIDER != "LOCAL_SIMULATOR" and settings.AI_API_KEY:
            try:
                headers = {"Authorization": f"Bearer {settings.AI_API_KEY}", "Content-Type": "application/json"}
                prompt = f"""
                You are Agent Copilot. Analyze this customer ticket and suggest responses/actions:
                Ticket Title: {title}
                Ticket Description: {description}
                {solution_context}
                
                Return a JSON payload with:
                - suggestedResponse: Draft email response.
                - recommendedActions: Action checklist.
                - summary: One-sentence ticket summary.
                """
                payload = {
                    "model": settings.LLM_MODEL_NAME,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"}
                }
                res = requests.post(f"{settings.AI_BASE_URL}/chat/completions", json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    import json
                    content = res.json()["choices"][0]["message"]["content"]
                    return json.loads(content)
            except Exception as e:
                print(f"Copilot LLM call failed: {e}. Using local simulator.")

        # Local copilot fallback
        draft_response = f"Hi there,\n\nThank you for reaching out to ResolveAI Support regarding '{title}'. We have noted your report: '{description[:80]}...'.\n\n"
        if "payment" in title.lower() or "billing" in title.lower() or "payment" in description.lower():
            draft_response += "We are currently checking the payment logs with our gateway provider to verify if your transaction cleared. If you were debited, a reconciliation is triggered automatically. Please expect an update within 24 hours."
            actions = ["Verify Stripe/PayPal transaction status", "Confirm bank reconciliation status", "Issue refund/credit if double-debited"]
            summary = "Billing query regarding failed or duplicate transaction"
        elif "delivery" in title.lower() or "shipping" in title.lower() or "delivery" in description.lower():
            draft_response += "We have escalated this package status to our logistics hub. We will check the tracking number milestones with the carrier and verify if it is held up. We will reply as soon as the dispatch team gives an update."
            actions = ["Query carrier API with tracking ID", "Contact courier hub dispatcher", "Email customer dispatch notice update"]
            summary = "Logistics inquiry regarding shipping delay"
        elif "security" in title.lower() or "login" in title.lower() or "password" in title.lower() or "hacked" in title.lower():
            draft_response += "For security reasons, we recommend resetting your account credentials immediately. If you suspect unauthorized access, our security team will temporarily flag your account for manual review."
            actions = ["Trigger security password reset link", "Check recent session IP addresses", "Activate multi-factor authentication (MFA)"]
            summary = "Security alert regarding account login failure/compromise"
        else:
            draft_response += "Our team has been assigned to investigate your ticket. We will review the details and get back to you shortly with resolution steps."
            actions = ["Review ticket details", "Locate customer record in system", "Formulate resolution response"]
            summary = "General inquiry about product or service"

        draft_response += "\n\nBest regards,\nResolveAI Support Team"
        
        return {
            "suggestedResponse": draft_response,
            "recommendedActions": actions,
            "summary": summary
        }

    def _simulate_chat_response(self, query: str, context_chunks: list) -> str:
        # If RAG found context, construct RAG-based reply
        if context_chunks:
            chunk = context_chunks[0]
            return f"According to our knowledge base ({chunk['file_name']}): {chunk['text']}\n\nI hope this helps! Let me know if you need more details."

        # Otherwise, match keywords
        q_lower = query.lower()
        if "payment" in q_lower or "billing" in q_lower or "charge" in q_lower:
            return "For failed payments, please check that your billing address matches your card details. If you were charged but did not receive a confirmation, our system automatically voids pending charges within 5-7 business days."
        elif "ship" in q_lower or "delivery" in q_lower or "delay" in q_lower or "track" in q_lower:
            return "Standard shipping takes 3-5 business days, and express takes 1-2. You can find your tracking link in your dispatch email. Let me know if you want me to look up a specific tracking number!"
        elif "return" in q_lower or "refund" in q_lower or "exchange" in q_lower:
            return "We offer a 30-day return policy for unused items in their original packaging. Once our warehouse receives and inspects the return, refunds are credited back to your original payment method in 5-10 business days."
        elif "password" in q_lower or "login" in q_lower or "reset" in q_lower:
            return "To reset your password, click the 'Forgot Password' link on the login page. Enter your registered email, and we will send you a password reset link shortly."
        return "Thank you for contacting ResolveAI support. Can you please provide more details about your inquiry? I am here to help you."

llm_gateway = LLMGateway()
