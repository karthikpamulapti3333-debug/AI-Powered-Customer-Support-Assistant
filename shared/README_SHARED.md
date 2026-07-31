# 📦 Shared Project Directory
## AI-Powered Customer Support and Ticket Management System

This standalone folder contains the complete, production-ready source code, database modules, test suites, architecture documentation, and PowerPoint presentation deck ready for distribution to team members, evaluators, and submission portals.

---

## 📁 Shared Folder Overview

```text
shared/
├── app/                             # Core Application Source Code
│   ├── models/                      # SQLAlchemy Relational Models (Admin, Ticket, Chat, etc.)
│   ├── routes/                      # Blueprint Controllers (Main, Chat, Tickets, Admin, KB, API)
│   ├── services/                    # CSV Exporter & Business Logic Services
│   ├── ai/                          # LLM Client (OpenAI/Gemini/Ollama) & RAG FAQ Search
│   ├── static/                      # Dark Glassmorphism CSS & ChatGPT JavaScript
│   └── templates/                   # Jinja2 Layout Templates (Bootstrap 5)
├── database/                        # SQL Schemas & Database Dumps
├── documentation/                   # Architecture Guides & Presentation (.pptx)
│   ├── AI_Customer_Support_Presentation.pptx
│   └── project_structure_guide.md
├── reports/                         # Generated CSV Reports & Export Artifacts
├── screenshots/                     # UI Screenshots & Screenshots Placeholder
├── deployment/                      # Cloud Deployment Configuration Files
├── tests/                           # Unittest Automated Test Suite
├── app.py                           # Application Entry Point
├── config.py                        # Central Configuration Setup
├── requirements.txt                 # Dependencies List
├── Procfile                         # Gunicorn Procfile
├── render.yaml                      # Render Blueprint Configuration
├── runtime.txt                      # Python 3.12 Runtime
├── .env.example                     # Environment Template
└── README.md                        # Documentation
```

---

## 🚀 Quick Execution Instructions

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser. All database tables and default Admin credentials (`admin@example.com` / `admin123`) are auto-created on startup via `db.create_all()`.

3. **Run Test Suite**:
   ```bash
   python -m unittest discover -s tests
   ```

4. **Render Cloud Deployment**:
   - Start Command: `gunicorn app:app`
   - Build Command: `pip install -r requirements.txt`
