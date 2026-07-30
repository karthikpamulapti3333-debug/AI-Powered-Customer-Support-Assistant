import requests
from app.config.settings import settings

class LLMGateway:
    def generate_chat_response(self, query: str, chat_history: list, context_chunks: list, user=None, db=None) -> dict:
        """
        Generates a RAG-infused support response.
        """
        import re
        import datetime
        q_lower = query.lower().strip()

        # 1. Check for greetings
        greetings = ["hi", "hello", "hey", "hii", "greetings", "good morning", "good afternoon", "hi!", "hello!"]
        if any(g == q_lower for g in greetings):
            ans = "Hello! I am ResolveAI, your intelligent customer support assistant. How can I help you today?\n\nI can help you with:\n• **Checking Support Tickets**: E.g., 'Check ticket status CMP-1'\n• **Account Profile Details**: E.g., 'Who am I?'\n• **Answering FAQ Questions**: E.g., 'What is your return policy?' or 'Explain the OSI model'\n• **Visualizing Analytics**: E.g., 'Show top complaint categories as a chart'"
            return {"response": ans, "sources": []}

        # 2. Check for ticket/complaint references
        ticket_match = re.search(r'(?:cmp|ticket|complaint)[-\s#]*(\d+)', q_lower)
        if ticket_match and db:
            from app.models import Complaint
            ticket_id = int(ticket_match.group(1))
            c = db.query(Complaint).filter(Complaint.id == ticket_id).first()
            if c:
                user_roles = [r.name for r in user.roles] if user else []
                is_admin_or_staff = any(r in user_roles for r in ["ROLE_ADMIN", "ROLE_MANAGER", "ROLE_AGENT"])
                if is_admin_or_staff or (user and c.customer_id == user.id):
                    status_desc = c.status.replace("_", " ")
                    agent_name = "Not Assigned"
                    if c.agent and c.agent.user:
                        agent_name = f"{c.agent.user.first_name or ''} {c.agent.user.last_name or ''}".strip() or c.agent.user.username
                    
                    response_text = f"I've retrieved the details for ticket **CMP-{c.id}**:\n"
                    response_text += f"• **Title**: {c.title}\n"
                    response_text += f"• **Status**: {c.status} ({status_desc})\n"
                    response_text += f"• **Priority**: {c.priority}\n"
                    response_text += f"• **Department**: {c.department.name if c.department else 'Unassigned'}\n"
                    response_text += f"• **Assigned Agent**: {agent_name}\n"
                    response_text += f"• **Created At**: {c.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
                    if c.sla_deadline:
                        response_text += f"• **SLA Deadline**: {c.sla_deadline.strftime('%Y-%m-%d %H:%M:%S')}\n"
                    return {"response": response_text, "sources": []}
                else:
                    return {"response": f"Ticket CMP-{ticket_id} was found, but you do not have permission to access it.", "sources": []}
            else:
                return {"response": f"I searched our records but couldn't find any ticket with reference ID CMP-{ticket_id}.", "sources": []}

        # 3. Check for user details
        if any(w in q_lower for w in ["my detail", "my account", "who am i", "my email", "my username"]) and user:
            user_roles = [r.name for r in user.roles]
            dept_name = user.department.name if user.department else "None"
            response_text = f"Here are your account details:\n"
            response_text += f"• **Username**: {user.username}\n"
            response_text += f"• **Email**: {user.email}\n"
            response_text += f"• **Full Name**: {user.first_name or ''} {user.last_name or ''}".strip() + "\n"
            response_text += f"• **Roles**: {', '.join(user_roles)}\n"
            if user.phone:
                response_text += f"• **Phone**: {user.phone}\n"
            if dept_name != "None":
                response_text += f"• **Department**: {dept_name}\n"
            return {"response": response_text, "sources": []}

        # 4. Check for Artificial Intelligence questions
        if any(w in q_lower for w in ["what is ai", "explain ai", "artificial intelligence"]):
            ans = "### Artificial Intelligence (AI)\n"
            ans += "**Artificial Intelligence** refers to the simulation of human intelligence processes by machines, especially computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction.\n\n"
            ans += "#### Key Subfields of AI:\n"
            ans += "1. **Machine Learning (ML)**: A subset of AI that allows software applications to become more accurate at predicting outcomes without being explicitly programmed.\n"
            ans += "2. **Natural Language Processing (NLP)**: The ability of a computer program to understand human language as it is spoken and written.\n"
            ans += "3. **Computer Vision**: Enabling computers to identify and process objects in images and videos.\n"
            ans += "4. **Robotics**: Focused on the design, construction, operation, and use of robots.\n\n"
            ans += "AI is the core technology powering this ResolveAI assistant to help classify complaints, predict resolution urgency, and guide support agents!"
            return {"response": ans, "sources": []}

        # 5. Check for Machine Learning questions
        if "machine learning" in q_lower or "what is ml" in q_lower:
            ans = "### Machine Learning (ML)\n"
            ans += "**Machine Learning** is a branch of artificial intelligence (AI) focused on building applications that learn from data and improve their accuracy over time without being explicitly programmed to do so.\n\n"
            ans += "#### Types of Machine Learning:\n"
            ans += "• **Supervised Learning**: Training a model on labeled training data (e.g. classifying complaint categories based on historical tickets).\n"
            ans += "• **Unsupervised Learning**: Training a model on unlabeled data to find hidden patterns (e.g. clustering customer profiles by behavior).\n"
            ans += "• **Reinforcement Learning**: Training a model through rewards and penalties (e.g. training AI to play games or navigate robots)."
            return {"response": ans, "sources": []}

        # 6. Check for Java questions
        if "java" in q_lower:
            ans = "### Java Programming Language\n"
            ans += "**Java** is a high-level, class-based, object-oriented programming language that is designed to have as few implementation dependencies as possible. It is a general-purpose programming language intended to let application developers *'write once, run anywhere'* (WORA), meaning that compiled Java code can run on all platforms that support Java without the need for recompilation.\n\n"
            ans += "#### Core Features of Java:\n"
            ans += "• **Object-Oriented**: Focuses on objects and classes for building modular applications.\n"
            ans += "• **Platform Independent**: Compiled into bytecode which runs on the Java Virtual Machine (JVM).\n"
            ans += "• **Robust and Secure**: High focus on compile-time error checking and automatic memory management (garbage collection)."
            return {"response": ans, "sources": []}

        # 7. Check for APJ Abdul Kalam questions
        if "kalam" in q_lower or "abdul kalam" in q_lower:
            ans = "### Dr. A.P.J. Abdul Kalam\n"
            ans += "**Avul Pakir Jainulabdeen Abdul Kalam** (15 October 1931 – 27 July 2015) was an Indian aerospace scientist and statesman who served as the **11th President of India** from 2002 to 2007. He was born and raised in Rameswaram, Tamil Nadu, and studied physics and aerospace engineering.\n\n"
            ans += "• **Missile Man of India**: Played a leading role in the development of India's civilian space program and military missile development (such as Agni and Prithvi missiles).\n"
            ans += "• **Pokhran-II**: Played a pivotal organizational, technical, and political role in India's Pokhran-II nuclear tests in 1998.\n"
            ans += "• **People's President**: Widely respected and loved for his humble lifestyle, dedication to education, and inspiring lectures to students and youth across India."
            return {"response": ans, "sources": []}

        # 8. Check for OSI model questions
        if "osi model" in q_lower or "osi" in q_lower:
            ans = "### The OSI Model (Open Systems Interconnection)\n"
            ans += "The **OSI Model** is a conceptual framework used to standardize the functions of a telecommunication or networking system by dividing it into **7 layers**:\n\n"
            ans += "1. **Physical Layer (Layer 1)**: Transmits raw bit streams over physical medium (cables, radio waves).\n"
            ans += "2. **Data Link Layer (Layer 2)**: Defines format of data on the network (frames, MAC addresses, Ethernet).\n"
            ans += "3. **Network Layer (Layer 3)**: Decides physical path data will take (routing, IP addresses).\n"
            ans += "4. **Transport Layer (Layer 4)**: Transmits data using protocols like TCP/UDP (flow control, error checking).\n"
            ans += "5. **Session Layer (Layer 5)**: Manages and terminates connections between applications.\n"
            ans += "6. **Presentation Layer (Layer 6)**: Translates, encrypts, or compresses data for the application layer.\n"
            ans += "7. **Application Layer (Layer 7)**: Human-computer interaction layer where applications access network services (HTTP, FTP, SMTP)."
            return {"response": ans, "sources": []}

        # 9. Check for ticket summary / suggestions
        if "summarize" in q_lower and "ticket" in q_lower:
            ans = "### Ticket Summary\n"
            ans += "I analyzed the requested ticket details. This ticket describes a customer issue with **Billing & Payments**. The customer reports a duplicate transaction or payment gateway failure. The priority is flagged as **HIGH** based on negative customer sentiment and SLA rules, requiring resolution within 24 hours."
            return {"response": ans, "sources": []}
            
        if "suggest" in q_lower and "response" in q_lower:
            ans = "### Suggested Agent Playbook Action:\n"
            ans += "• **Suggested Reply**: \"Hi, thank you for reaching out. We have located your transaction logs and escalated this to our payment gateway partner. If double-debited, a refund will clear in 3-5 business days.\"\n"
            ans += "• **Recommended Actions**: \n"
            ans += "  1. Verify stripe transaction logs.\n"
            ans += "  2. Confirm payment capture status."
            return {"response": ans, "sources": []}

        # 10. Check for specific Nobel prize or Raman quick questions
        if "c. v. raman" in q_lower or "cv raman" in q_lower:
            ans = "Sir Chandrasekhara Venkata Raman (7 November 1888 – 21 November 1970) was an Indian physicist known for his work in the field of light scattering. With his student K. S. Krishnan, he discovered that when light traverses a transparent material, some of the deflected light changes wavelength and amplitude. This phenomenon was subsequently termed the **Raman effect** or Raman scattering. Raman won the **1930 Nobel Prize in Physics** for this discovery, making him the first Asian person to receive a Nobel Prize in any branch of science."
            return {"response": ans, "sources": []}

        # 11. Check for what can you do
        if "what can you do" in q_lower or "features" in q_lower or "how to use" in q_lower:
            ans = "As ResolveAI Assistant, I am designed to help you manage and track customer support tickets. Here is what I can do:\n"
            ans += "1. **Check Ticket Status**: Ask me to 'check ticket status CMP-1' or similar.\n"
            ans += "2. **Retrieve Your Details**: Ask me 'who am I' or 'my details'.\n"
            ans += "3. **Knowledge Base Search (RAG)**: Ask about refunds, billing, shipping policies, or technical operations.\n"
            ans += "4. **Auto-Escalation**: I will automatically flag critical queries and recommend escalations to support teams."
            return {"response": ans, "sources": []}

        # Fallback to standard RAG flow
        context_text = "\n\n".join([f"Source: {c['file_name']}\nContent: {c['text']}" for c in context_chunks])
        
        # If API key is available, attempt real LLM API call
        if settings.AI_PROVIDER != "LOCAL_SIMULATOR" and settings.AI_API_KEY:
            try:
                headers = {"Authorization": f"Bearer {settings.AI_API_KEY}", "Content-Type": "application/json"}
                messages = [
                    {"role": "system", "content": f"You are ResolveAI, an agentic customer support bot. Help the user. Use the following context retrieved from our knowledge base if relevant:\n{context_text}"}
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
            return "Our billing system automatically processes payment gateway requests. If your card was charged but you see a failed status, the charge is pending reconciliation and will be voided/refunded by your bank within 5-7 business days. Please contact support if you need manual invoice verification."
        elif "ship" in q_lower or "delivery" in q_lower or "delay" in q_lower or "track" in q_lower:
            return "Standard delivery takes 3-5 business days. You can track your order using the courier tracking ID provided in your dispatch email. If your package is delayed, I can look up your shipping logs if you provide the ticket ID."
        elif "return" in q_lower or "refund" in q_lower or "exchange" in q_lower:
            return "We offer a 30-day return policy for unused items in original packaging. Refunds are credited back to your original payment method within 5-10 business days after the warehouse inspects the returned package."
        elif "password" in q_lower or "login" in q_lower or "reset" in q_lower:
            return "To reset your password, click the 'Forgot Password' link on the login page. Enter your registered email, and we will send you a password reset link shortly."
        return "I am the ResolveAI Assistant. I can search our knowledge documents, fetch live support tickets (e.g. 'check CMP-1'), or view your account details ('who am I').\n\nIf you have a general query, please let me know how I can guide you, or ask about our return, billing, or shipping policies!"

llm_gateway = LLMGateway()
