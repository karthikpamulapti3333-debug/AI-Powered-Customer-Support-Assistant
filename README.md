# ResolveAI - AI Customer Support & Ticket Management System (Flask Edition)

ResolveAI is a production-ready, AI-powered customer support and automated ticket management platform built with **Python 3.12, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, PostgreSQL/SQLite, and Bootstrap 5**.

---

## 🚀 Key Features

- **2-Role Access Control**:
  - 👤 **Customer**: Interactive AI Chatbot with conversation memory, ticket submission, status tracking, profile management, and notification system.
  - ⚙️ **Admin**: High-level dashboard metrics, customer registry management, ticket lifecycle control (Open, Pending, Resolved, Closed), Knowledge Base FAQ publishing, Chart.js analytics graphs, and CSV report exporter.
- **Configurable LLM AI Integration**:
  - Supports OpenAI GPT (`gpt-3.5-turbo`, `gpt-4`), Google Gemini (`gemini-pro`), Ollama, or local fallback models via environment configuration (`AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `LLM_MODEL_NAME`).
  - Automatic Knowledge Base FAQ lookup before calling the LLM.
  - Intent classification (Billing, Technical, Account, Logistics) & Sentiment analysis.
  - Automatic ticket escalation recommendation when confidence < 0.6.
- **Render Ready**: Includes `render.yaml`, `Procfile`, `runtime.txt`, `requirements.txt`, and `.env.example` for zero-configuration one-click deployment on Render.

---

## 📁 Architecture & Folder Structure

```text
c:\Users\karth\OneDrive\Desktop\AI-Powered-Customer-Support-Assistant\
├── app/
│   ├── __init__.py            # Flask App Factory Pattern & DB Seeding
│   ├── config.py              # Dev, Test, Prod Configuration
│   ├── models/                # SQLAlchemy Schemas (User, ChatSession, Message, Ticket, etc.)
│   ├── routes/                # Blueprint Controllers (main, auth, chat, ticket, customer, admin, kb, api)
│   ├── services/              # Business Logic Services
│   ├── ai/                    # Real LLM Engine, FAQ search, Intent Classifier
│   ├── middleware/            # JWT & RBAC Decorators
│   ├── utils/                 # Logging & CSV Exporter
│   ├── static/                # Glassmorphic CSS, Vanilla JS (chat.js, dashboard.js)
│   └── templates/             # Jinja2 Bootstrap 5 Templates
├── instance/                  # Local SQLite storage directory
├── tests/                     # Automated Test Suite (python -m unittest discover -s tests)
├── app.py                     # Entry point (python app.py & gunicorn app:app)
├── requirements.txt           # Dependencies
├── Procfile                   # Gunicorn Render process
├── render.yaml                # Render Blueprint setup
├── runtime.txt                # Python 3.12 runtime
├── README.md                  # Comprehensive Documentation
└── .env.example               # Template environment configuration
```

---

## 🔑 Seed User Credentials (Auto-Generated)

When the application initializes, the following demo accounts are created automatically:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| ⚙️ **Admin** | `admin@example.com` | `admin123` | Full administrative control, user registry, ticket status updates, FAQ CRUD, CSV exporter. |
| 👤 **Customer** | `customer@example.com` | `customer123` | AI Chatbot, Ticket submission, Ticket tracking, Profile updates. |

---

## 💻 Local Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   SECRET_KEY=super-secret-flask-key-32-characters-minimum!
   JWT_SECRET_KEY=super-secret-jwt-key-32-characters-minimum!
   DATABASE_URL=sqlite:///instance/resolveai.db
   AI_PROVIDER=LOCAL_SIMULATOR
   AI_API_KEY=your_optional_api_key
   LLM_MODEL_NAME=gpt-3.5-turbo
   FLASK_ENV=development
   ```

3. **Run Application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser.

4. **Run Production Server (Gunicorn)**:
   ```bash
   gunicorn app:app
   ```

---

## 🧪 Running Automated Tests

Run the unittest test suite covering authentication, AI chat memory, ticket lifecycle, and REST APIs:

```bash
python -m unittest discover -s tests
```

---

## 🌐 Deploying to Render

1. Push code to your GitHub repository.
2. In Render, select **New Web Service** (or import `render.yaml`).
3. Connect your repository and configure:
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Set Environment Variables (`DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `AI_PROVIDER`).
5. Deploy!

---

## 📑 REST API Documentation

### Authentication
- `POST /auth/register` (or `/api/register`): Register new Customer account.
- `POST /auth/login` (or `/api/login`): User login; returns JWT token & sets HTTP-only cookies.
- `POST /auth/logout` (or `/api/logout`): Logout user.
- `GET/PUT /auth/profile` (or `/api/profile`): Get/Update current user profile.

### AI Chatbot
- `POST /chat/message` (or `/api/chat`): Send user message, returns AI response & Markdown text.
- `GET /chat/history` (or `/api/chat/history`): Get conversation history.
- `DELETE /chat/history` (or `/api/chat/history`): Clear session messages.

### Tickets
- `POST /tickets/new` (or `/api/tickets`): Create new support ticket.
- `GET /tickets` (or `/api/tickets`): List customer or admin tickets.
- `GET /tickets/<id>` (or `/api/tickets/<id>`): View ticket details and replies.
- `POST /tickets/<id>/reply`: Add response to ticket.
- `POST /tickets/<id>/status` (or `PUT /api/tickets/<id>`): Update status (Open, Pending, Resolved, Closed).
- `POST /tickets/<id>/close`: Close support ticket.

### Admin & Analytics
- `GET /admin/dashboard` (or `/api/admin/dashboard`): Dashboard summary metrics.
- `GET /admin/users` (or `/api/admin/users`): Customer user list.
- `GET /admin/analytics`: Chart.js status and category distributions.
- `GET /admin/export/tickets`: Download CSV report of all support tickets.
