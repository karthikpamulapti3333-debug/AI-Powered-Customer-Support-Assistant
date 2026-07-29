# ResolveAI – Intelligent Customer Complaint Prediction and Resolution System

ResolveAI is a production-quality, AI-powered customer complaint management and resolution platform. It combines natural language processing (NLP) to auto-categorize tickets, detect sentiment, map intents, evaluate SLA risks, and recommend action steps, while orchestrating support workflows in Spring Boot and presenting analytical dashboards in React.js.

---

## 1. Project Overview & Business Relevance

### Problem Statement
Businesses face growing volumes of customer service interactions and require automated classification, prioritization, and intelligent routing to prevent SLA breaches and manual triage delays.

### Solution
When a customer files a ticket, ResolveAI's ML pipeline:
1. Classifies the ticket into **9 categories** (PAYMENT, DELIVERY, PRODUCT, ACCOUNT, TECHNICAL, etc.).
2. Identifies customer **intents** (PAYMENT_FAILED, ORDER_DELAY, etc.).
3. Performs **sentiment analysis** (VERY_NEGATIVE, NEGATIVE, NEUTRAL, POSITIVE).
4. Predicts **urgency priorities** (LOW, MEDIUM, HIGH, CRITICAL).
5. Projects **escalation risk scores** (0.0 to 1.0).
6. Diagnoses the **root cause** and pulls **playbook steps** for resolving the issue.
7. Automatically routes the ticket to the correct department and assigns it to the support agent with the lowest active load.

---

## 2. Directory Structure

```
ResolveAI/
│
├── database/                      # Migration SQL scripts
│   └── migration_scripts/         # V1__init_schema.sql, V2__seed_data.sql
│
├── ai-service/                    # FastAPI NLP microservice
│   ├── data/                      # Synthetic data generator & complaints CSV
│   ├── models/                    # Serialized joblib models
│   ├── requirements.txt           # Python dependency file
│   ├── train.py                   # Script to train 6 ML models
│   └── main.py                    # API inference server
│
├── backend/                       # Spring Boot core backend service
│   ├── src/main/java/...          # JWT Security, Controllers, Entities, Repositories, Services
│   ├── src/main/resources/        # application.yml and copied migrations
│   ├── pom.xml                    # Maven project model
│   └── mvnw / mvnw.cmd            # Maven Wrapper scripts
│
├── frontend/                      # React Vite client application
│   ├── src/                       # Components (Sidebar, Navbar), Services (api.js), Pages (Dashboards)
│   ├── index.html / package.json  # Vite dependencies & entry page
│   └── tailwind.config.js         # Styling configurations
│
├── docs/                          # In-depth technical guides
│   ├── architecture.md            # System layout & pipelines
│   ├── database.md                # Entity Relation models
│   ├── api.md                     # Endpoint parameters
│   └── setup.md                   # Installation walkthroughs
│
├── postman/                       # Postman testing files
│   └── ResolveAI_Postman_Collection.json
│
├── docker-compose.yml             # Containerized environment script
└── README.md                      # General introduction
```

---

## 3. Technology Stack

- **Frontend**: React.js, Vite, Axios, Tailwind CSS, Recharts.js, Lucide Icons.
- **Backend**: Java 21, Spring Boot 3.x, Spring Data JPA, Spring Security, JWT (JJWT 0.11.5), Maven, Flyway.
- **AI/ML Service**: Python 3.11, FastAPI, Uvicorn, Scikit-learn, Pandas, Joblib.
- **Database**: MySQL 8.x (fallback H2 in-memory MySQL mode for out-of-the-box dev launches).

---

## 4. Quick Start Instructions

Please read the extensive [Setup Manual](file:///C:/Users/karth/.gemini/antigravity/scratch/ResolveAI/docs/setup.md) for detailed environment configuration commands.

### Phase 1: Python AI Service
```bash
cd ai-service
pip install -r requirements.txt
python train.py
python -m uvicorn main:app --port 8000
```

### Phase 2: Spring Boot Backend
```bash
cd backend
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
./mvnw clean compile package -DskipTests
./mvnw spring-boot:run
```

### Phase 3: React Client
```bash
cd frontend
npm install
npm run dev
```

---

## 5. Demo Accounts

Log in to the front-end at `http://localhost:5173` using the following development credentials:

| Role | Username | Password | Triage Focus |
|---|---|---|---|
| **System Admin** | `admin` | `admin123` | CRUD tables, SLA configs, knowledge bases |
| **Support Manager** | `manager` | `manager123` | Recharts graphs, assignment queue, escalations |
| **Billing Agent** | `agent_billing` | `agent123` | Resolve billing & payment issues, view AI playbooks |
| **Logistics Agent** | `agent_logistics` | `agent123` | Resolve delays & wrong address shipping tickets |
| **Customer** | `customer` | `customer123` | Submit complaints & review sentiment indices |
