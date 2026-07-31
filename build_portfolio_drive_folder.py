import os
import shutil
import zipfile

def build_portfolio_package():
    project_root = os.path.abspath(os.path.dirname(__file__))
    portfolio_dir = os.path.join(project_root, "Portfolio")

    # Ensure Portfolio directory and subdirectories exist
    os.makedirs(portfolio_dir, exist_ok=True)
    
    # Subdirectories
    subdirs = [
        "Source_Code",
        "Documentation",
        "Presentation",
        "Screenshots",
        "Deployment",
        "Demo"
    ]

    for sd in subdirs:
        os.makedirs(os.path.join(portfolio_dir, sd), exist_ok=True)

    # 1. Zip Source Code into Source_Code/AI-Powered-Customer-Support-Assistant.zip
    zip_path = os.path.join(portfolio_dir, "Source_Code", "AI-Powered-Customer-Support-Assistant.zip")
    print(f"Creating Source Code Zip at: {zip_path}")
    
    exclude_dirs = {'.git', '__pycache__', 'instance', 'Portfolio', 'shared', 'venv', '.pytest_cache'}
    exclude_files = {'.DS_Store', 'resolveai.db'}

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_root):
            # Exclude unwanted directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file not in exclude_files and not file.endswith('.pyc'):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, project_root)
                    zipf.write(file_path, arcname)

    # 2. Copy Presentation Deck into Presentation/Project_Presentation.pptx
    src_pptx = os.path.join(project_root, "AI_Customer_Support_Presentation.pptx")
    dst_pptx = os.path.join(portfolio_dir, "Presentation", "Project_Presentation.pptx")
    if os.path.exists(src_pptx):
        shutil.copy2(src_pptx, dst_pptx)

    # 3. Create Deployment text files
    render_link_content = "https://resolveai-support.onrender.com (or your Render URL)\n"
    github_link_content = "https://github.com/karthikpamulapti3333-debug/AI-Powered-Customer-Support-Assistant\n"

    with open(os.path.join(portfolio_dir, "Deployment", "Render_Link.txt"), "w", encoding="utf-8") as f:
        f.write(render_link_content)

    with open(os.path.join(portfolio_dir, "Deployment", "GitHub_Link.txt"), "w", encoding="utf-8") as f:
        f.write(github_link_content)

    # 4. Create Documentation files
    report_content = """# Final Project Report
## AI-Powered Customer Support and Ticket Management System

### Abstract
This project delivers a modern AI-driven customer support platform built using Python Flask, SQLAlchemy, Bootstrap 5, and configurable LLM APIs (OpenAI, Gemini, Ollama). It provides zero-friction instant AI support for public website visitors while automating ticket creation and equipping administrators with real-time analytics.

### Key Highlights
- Instant Guest AI Chatbot with pre-LLM Knowledge Base RAG lookup.
- Automatic Ticket Escalation with unique Ticket IDs (`TICK-XXXXXXXX`).
- Admin Management Console powered by Flask-Login (`admin@example.com` / `admin123`).
- Zero-Migration database auto-schema creation (`db.create_all()`).
- Deployed on Render using Gunicorn.
"""
    with open(os.path.join(portfolio_dir, "Documentation", "Project_Report.md"), "w", encoding="utf-8") as f:
        f.write(report_content)

    manual_content = """# User & Administrator Manual

## 1. Guest Visitors
- Open homepage `http://127.0.0.1:5000/` or live Render URL.
- Type any product, billing, or technical question into the instant AI Chat.
- Click 'Submit Support Ticket' to open a ticket directly.

## 2. Administrators
- Access `/admin/login` using `admin@example.com` / `admin123`.
- Manage tickets, reply, change statuses, manage Knowledge Base FAQs, view Chart.js analytics, and export CSV reports.
"""
    with open(os.path.join(portfolio_dir, "Documentation", "User_Manual.md"), "w", encoding="utf-8") as f:
        f.write(manual_content)

    readme_doc = """# AI Customer Support System - Project Readme

Refer to main README.md inside Source_Code zip or project root for complete setup details.
"""
    with open(os.path.join(portfolio_dir, "Documentation", "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_doc)

    # 5. Create Screenshot placeholders / info text
    screenshot_info = "Place screenshot image files here (Home_Page.png, Chat_Interface.png, Admin_Dashboard.png, Ticket_Management.png)\n"
    with open(os.path.join(portfolio_dir, "Screenshots", "README_SCREENSHOTS.txt"), "w", encoding="utf-8") as f:
        f.write(screenshot_info)

    demo_info = "Place project demonstration video file here (Demo_Video.mp4)\n"
    with open(os.path.join(portfolio_dir, "Demo", "README_DEMO.txt"), "w", encoding="utf-8") as f:
        f.write(demo_info)

    # 6. Create Portfolio/README.md
    portfolio_readme = """# 📁 Portfolio Shared Drive Package
## AI-Powered Customer Support and Ticket Management System

This folder is structured for Google Drive sharing and academic portfolio submission.

---

## 📂 Directory Structure

```text
Portfolio/
├── index.html                    # Interactive Web Portfolio Page
├── Source_Code/
│   └── AI-Powered-Customer-Support-Assistant.zip
├── Documentation/
│   ├── Project_Report.md
│   ├── User_Manual.md
│   └── README.md
├── Presentation/
│   └── Project_Presentation.pptx
├── Screenshots/
│   ├── README_SCREENSHOTS.txt
│   ├── Home_Page.png
│   ├── Chat_Interface.png
│   ├── Admin_Dashboard.png
│   └── Ticket_Management.png
├── Deployment/
│   ├── Render_Link.txt
│   └── GitHub_Link.txt
└── Demo/
    └── README_DEMO.txt
```

---

## 🚀 Quick Links
- **GitHub Repository**: https://github.com/karthikpamulapti3333-debug/AI-Powered-Customer-Support-Assistant
- **Admin Demo Login**: `admin@example.com` / `admin123`
"""
    with open(os.path.join(portfolio_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(portfolio_readme)

    print("Portfolio Package constructed successfully!")

if __name__ == "__main__":
    build_portfolio_package()
