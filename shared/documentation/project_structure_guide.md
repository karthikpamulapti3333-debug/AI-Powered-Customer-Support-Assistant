# Shared Project Folder Structure & Architecture Guide
## AI-Powered Customer Support and Ticket Management System

This document outlines the complete organizational architecture, module responsibilities, user access permissions, deployment procedures, and backup/recovery workflows for team members and reviewers.

---

## 📁 1. Project Folder Tree Representation

```text
AI-Powered-Customer-Support-Assistant/
│
├── app/                             # Main Application Package
│   ├── models/                      # SQLAlchemy Database Schemas & Models
│   │   ├── __init__.py
│   │   ├── admin.py                 # Admin User Model (Flask-Login UserMixin)
│   │   ├── chat.py                  # ChatSession & Message Models
│   │   ├── ticket.py                # Ticket & TicketReply Models
│   │   ├── knowledge.py             # KnowledgeBase FAQ Model
│   │   └── activity.py              # Audit ActivityLog Model
│   ├── routes/                      # Flask Blueprint Controllers
│   │   ├── __init__.py
│   │   ├── main_routes.py           # Homepage & Contact Controller
│   │   ├── chat_routes.py           # Guest AI Chat Message Endpoints
│   │   ├── ticket_routes.py         # Guest Ticket Creation & Admin Management
│   │   ├── admin_routes.py          # Admin Login, Dashboard, Analytics, Exporter
│   │   ├── kb_routes.py             # Knowledge Base FAQ CRUD Controller
│   │   └── api_routes.py            # Unified REST API Endpoints
│   ├── services/                    # Business Logic & Helper Services
│   │   ├── __init__.py
│   │   └── exporter.py              # CSV Ticket Report Generator Service
│   ├── ai/                          # AI Engine & RAG Retrieval Modules
│   │   ├── __init__.py
│   │   ├── llm_client.py            # Configurable LLM API Client (OpenAI/Gemini/Ollama)
│   │   ├── intent_detector.py       # Intent & Sentiment Classifier
│   │   └── memory.py                # Session Conversation Context Memory
│   ├── middleware/                  # Middleware & Custom Decorators
│   │   └── .gitkeep
│   ├── static/                      # Frontend Static Web Assets
│   │   ├── css/
│   │   │   └── style.css            # Dark Glassmorphism SaaS Theme
│   │   ├── js/
│   │   │   └── chat.js              # Instant ChatGPT UI Client Logic
│   │   └── images/                  # Project Screenshots & Visual Assets
│   │       └── .gitkeep
│   └── templates/                   # Jinja2 HTML Layout Templates
│       ├── base.html                # Master HTML Base Layout
│       ├── index.html               # Homepage with Instant Chat & Ticket Modal
│       ├── admin/                   # Restricted Admin Templates
│       │   ├── login.html           # Admin Login Page
│       │   ├── dashboard.html       # Admin Metrics & Quick Queue Table
│       │   ├── tickets.html         # Master Support Ticket Registry
│       │   ├── ticket_detail.html   # Ticket Response & Status Manager
│       │   ├── kb.html              # Knowledge Base FAQ Manager
│       │   └── analytics.html       # Chart.js Analytics Graphs
│       └── errors/                  # Custom HTTP Error Pages
│           ├── 401.html
│           ├── 403.html
│           ├── 404.html
│           └── 500.html
│
├── database/                        # Database Schemas & SQL Backup Dumps
│   └── .gitkeep
├── instance/                        # Local SQLite Database Storage (Auto-created)
│   └── resolveai.db
├── tests/                           # Unittest Automated Test Suite
│   ├── __init__.py
│   ├── test_auth.py                 # Admin Login & Session Unit Tests
│   ├── test_chat.py                 # Guest Chat & RAG Search Unit Tests
│   ├── test_tickets.py              # Ticket Creation & Admin Reply Tests
│   └── test_kb.py                   # Knowledge Base FAQ CRUD Unit Tests
├── screenshots/                     # UI Screenshots & Demo Captures
│   └── .gitkeep
├── documentation/                   # Project Reports, Architecture Guides & PPT Deck
│   ├── project_structure_guide.md
│   └── .gitkeep
├── reports/                         # Generated CSV Reports & Export Artifacts
│   └── .gitkeep
├── deployment/                      # Docker & Cloud Deployment Manifests
│   └── .gitkeep
├── app.py                           # Main Application Entry Point
├── config.py                        # Central Environment & Flask Configuration
├── requirements.txt                 # Python Dependencies List
├── Procfile                         # Gunicorn Web Process Configuration
├── render.yaml                      # Render Blueprint Cloud Deployment Manifest
├── runtime.txt                      # Python 3.12 Runtime Specification
├── .env.example                     # Environment Variables Template
└── README.md                        # Master Project Documentation
```

---

## 🎯 2. Folder Purpose & Directory Analysis

| Folder Name | Primary Purpose | Contained Files | User Access Rights |
|---|---|---|---|
| `app/` | Main application package containing models, routes, templates, and AI logic. | `__init__.py`, `extensions.py` | Developers & Admins (Read/Write) |
| `app/models/` | SQLAlchemy relational database schema definitions. | `admin.py`, `chat.py`, `ticket.py`, `knowledge.py`, `activity.py` | Developers (Read/Write) |
| `app/routes/` | Modular Flask Blueprint controllers handling endpoints and page rendering. | `main_routes.py`, `chat_routes.py`, `ticket_routes.py`, `admin_routes.py`, `kb_routes.py`, `api_routes.py` | Developers (Read/Write) |
| `app/ai/` | Multi-provider LLM API client, RAG Knowledge Base search, and intent classifier. | `llm_client.py`, `intent_detector.py`, `memory.py` | Developers (Read/Write) |
| `app/services/` | Business logic services including CSV report export generation. | `exporter.py` | Developers (Read/Write) |
| `app/static/` | Frontend assets (CSS styles, Vanilla JS chat scripts, brand assets). | `style.css`, `chat.js` | Public Guests (Read), Developers (Read/Write) |
| `app/templates/` | Jinja2 HTML templates for instant chat, ticket modal, and admin portal. | `base.html`, `index.html`, `admin/*.html`, `errors/*.html` | Public Guests & Admin (View rendered output) |
| `database/` | SQL dumps, schema initialization scripts, and backup snapshots. | `.gitkeep`, DB SQL exports | System Admins & DevOps (Read/Write) |
| `instance/` | Local SQLite database file location (`resolveai.db`). | `resolveai.db` | System Admin & App Runtime (Read/Write) |
| `tests/` | Automated unit test suite verifying auth, chat, tickets, and APIs. | `test_auth.py`, `test_chat.py`, `test_tickets.py`, `test_kb.py` | Developers & CI/CD Pipelines |
| `screenshots/` | UI screenshots, demo captures, and presentation graphics. | `.gitkeep`, image artifacts | Project Reviewers & Team Members |
| `documentation/` | Comprehensive technical architecture guides, PPT decks, and project reports. | `project_structure_guide.md` | All Team Members & Evaluators |
| `reports/` | Generated CSV ticket exports and analytics logs. | Generated CSVs | Admin Users (Download) |
| `deployment/` | Cloud and container deployment manifests. | `Procfile`, `render.yaml`, `runtime.txt` | DevOps & Cloud Deployment Platforms |

---

## 🔒 3. User Access Permissions & RBAC Matrix

| User Role | Authentication Required | Accessible Paths & Features | Restricted Areas |
|---|---|---|---|
| **Public Guest** | ❌ **None (Zero Login)** | • Homepage (`/`)<br>• Instant AI Support Chatbot (`/chat/message`)<br>• Support Ticket Form Modal (`/tickets/new`)<br>• Contact Form (`/contact`) | 🚫 `/admin/*`, `/admin/dashboard`, Ticket Management, Analytics |
| **System Administrator** | ✅ **Required (`Flask-Login` session)** | • Admin Login (`/admin/login`)<br>• Admin Dashboard (`/admin/dashboard`)<br>• Master Ticket Queue (`/tickets/`)<br>• Ticket Detail & Reply (`/tickets/<id>`)<br>• FAQ Knowledge Base Manager (`/kb/`)<br>• Chart.js Analytics (`/admin/analytics`)<br>• CSV Export (`/admin/export/tickets`) | None (Full System Access) |
| **Developer / Contributor** | 🔑 **Git SSH / Codebase Access** | • Full source code access (`app/`, `tests/`, `config.py`)<br>• Database Schema modification<br>• Environment configuration | Private API Keys (`.env`) |

---

## 🚀 4. Deployment Instructions

### Local Development Setup
1. **Clone Repository & Install Dependencies**:
   ```bash
   git clone https://github.com/karthikpamulapti3333-debug/AI-Powered-Customer-Support-Assistant.git
   cd AI-Powered-Customer-Support-Assistant
   pip install -r requirements.txt
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   SECRET_KEY=super-secret-flask-key-32-characters-minimum!
   FLASK_ENV=development
   AI_PROVIDER=LOCAL_SIMULATOR
   ```
3. **Run Application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser. All database tables and initial Admin credentials (`admin@example.com` / `admin123`) are created automatically via `db.create_all()`.

4. **Execute Automated Test Suite**:
   ```bash
   python -m unittest discover -s tests
   ```

### Production Deployment on Render
1. Push code to GitHub repository (`main` branch).
2. On Render Dashboard ([https://dashboard.render.com](https://dashboard.render.com)), create a **Web Service** connecting the repository.
3. Configure Build and Start parameters:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Add Environment Variables (`SECRET_KEY`, `FLASK_ENV=production`, `AI_PROVIDER`).
5. Render will automatically install dependencies, execute Gunicorn WSGI server, and auto-initialize PostgreSQL/SQLite tables on first startup.

---

## 💾 5. Backup & Recovery Procedures

### Database Backup Procedure
1. **SQLite (Development)**:
   - Copy `instance/resolveai.db` to a secure backup folder or the `database/` directory.
   - Command: `cp instance/resolveai.db database/backup_resolveai_$(date +%F).db`
2. **PostgreSQL (Production on Render)**:
   - Perform automated database snapshot dumps via pg_dump:
   - Command: `pg_dump $DATABASE_URL > database/postgres_backup_$(date +%F).sql`

### System Recovery Procedure
1. **Database Restoration**:
   - Restore database file to `instance/resolveai.db` or execute SQL restoration script against PostgreSQL instance:
   - Command: `psql $DATABASE_URL < database/postgres_backup_YYYY-MM-DD.sql`
2. **Configuration & Secrets Recovery**:
   - Restore `.env` configuration template from `.env.example`.
3. **Automated Schema Regeneration**:
   - If the database file is missing or corrupted, launching `python app.py` will automatically invoke `db.create_all()` and `seed_database()`, regenerating clean database tables and default Admin credentials (`admin@example.com` / `admin123`).
