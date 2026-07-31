# AI-Powered Customer Support and Ticket Management System

## Project Overview
A production-ready customer support platform combining instant unauthenticated guest AI assistance, Knowledge Base RAG retrieval, automated ticket escalation, and a single-auth Admin Console.

## Setup & Running Locally
1. Install dependencies: `pip install -r requirements.txt`
2. Run application: `python app.py`
3. Access local app at `http://127.0.0.1:5000`

## Default Admin Credentials
- **Email**: `admin@example.com`
- **Password**: `admin123`

## Cloud Deployment (Render)
- **Start Command**: `gunicorn app:app`
- **Build Command**: `pip install -r requirements.txt`
- **Live Production URL**: https://resolveai-support.onrender.com
