# ResolveAI - AI Customer Support & Ticket Management System (Flask Edition)

ResolveAI is a production-ready, AI-powered customer support and automated ticket management platform built with **Python 3.12, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, PostgreSQL/SQLite, and Bootstrap 5**.

---

## 🚀 Architectural Paradigm: Single-Auth & Instant Guest Access

- 🌐 **Instant Guest AI Chat & Ticket Submission (`/`)**:
  - Visitors immediately interact with the ChatGPT-style AI Assistant upon opening the website.
  - **Zero Customer Login, Registration, or Authentication**: No customer account creation required.
  - Visitors can submit support tickets directly via the ticket modal (capturing `Name`, `Email`, `Phone`, `Subject`, `Description`, `Priority`), receiving a unique Ticket ID (e.g. `TICK-8F92A1B3`).
- ⚙️ **Admin-Only Authentication (`/admin/login`)**:
  - Only administrators log in to access the system (`admin@example.com` / `admin123`).
  - Access to Executive Dashboard, Master Ticket Queue, Ticket Status Control, Response Threading, Knowledge Base FAQ Publishing, Chart.js Analytics, and CSV Report Exporting.

---

## 🔑 Admin Seed Credentials

Upon initial launch, the system automatically seeds the following administrator account:

| Portal Role | Admin Email | Admin Password | Access Rights |
|---|---|---|---|
| ⚙️ **System Admin** | `admin@example.com` | `admin123` | Full control over tickets, FAQ Knowledge Base, Analytics, and CSV exports. |

---

## 🤖 Configurable LLM AI Integration (`app/ai/llm_client.py`)

- Supports OpenAI GPT (`gpt-3.5-turbo`, `gpt-4`), Google Gemini (`gemini-pro`), Ollama, or local fallback models via environment configuration (`AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `LLM_MODEL_NAME`).
- Searches verified Knowledge Base FAQs before querying external LLMs.
- Detects sentiment and intent (Billing, Technical, Account, Logistics).
- Automatically triggers ticket modal recommendation when confidence is low (< 0.6).

---

## 💻 Local Installation & Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables** (`.env`):
   ```bash
   SECRET_KEY=super-secret-flask-key-32-characters-minimum!
   JWT_SECRET_KEY=super-secret-jwt-key-32-characters-minimum!
   DATABASE_URL=sqlite:///instance/resolveai.db
   AI_PROVIDER=LOCAL_SIMULATOR
   ```

3. **Launch Server**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` to start chatting as a guest, or `http://127.0.0.1:5000/admin/login` for Admin console.

4. **Run Production Server (Gunicorn)**:
   ```bash
   gunicorn app:app
   ```

5. **Run Automated Test Suite**:
   ```bash
   python -m unittest discover -s tests
   ```

---

## 🌐 Render Deployment Guide

1. Push repository to GitHub.
2. Create a Web Service on Render connecting the repository.
3. Configure Build Command: `pip install -r requirements.txt`.
4. Configure Start Command: `gunicorn app:app`.
5. Add environment variables (`DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `AI_PROVIDER`).
