import os
import shutil

def populate_shared():
    project_root = os.path.abspath(os.path.dirname(__file__))
    shared_dir = os.path.join(project_root, "shared")

    # Clean / recreate shared directory
    if os.path.exists(shared_dir):
        shutil.rmtree(shared_dir)
    os.makedirs(shared_dir, exist_ok=True)

    # Directories to copy
    dirs_to_copy = [
        "app",
        "database",
        "documentation",
        "reports",
        "screenshots",
        "deployment",
        "tests"
    ]

    for d in dirs_to_copy:
        src = os.path.join(project_root, d)
        dst = os.path.join(shared_dir, d)
        if os.path.exists(src):
            shutil.copytree(src, dst)
        else:
            os.makedirs(dst, exist_ok=True)

    # Copy key root files
    files_to_copy = [
        "app.py",
        "config.py",
        "requirements.txt",
        "Procfile",
        "render.yaml",
        "runtime.txt",
        ".env.example",
        "README.md",
        "AI_Customer_Support_Presentation.pptx"
    ]

    for f in files_to_copy:
        src = os.path.join(project_root, f)
        if os.path.exists(src):
            # Copy to shared root as well as documentation/ for PPT
            shutil.copy2(src, os.path.join(shared_dir, f))
            if f == "AI_Customer_Support_Presentation.pptx":
                doc_dst = os.path.join(shared_dir, "documentation", f)
                shutil.copy2(src, doc_dst)

    # Create README_SHARED.md inside shared/
    readme_shared_content = """# 📦 Shared Project Directory
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
"""
    with open(os.path.join(shared_dir, "README_SHARED.md"), "w", encoding="utf-8") as rf:
        rf.write(readme_shared_content)

    print(f"Shared folder created successfully at: {shared_dir}")

if __name__ == "__main__":
    populate_shared()
