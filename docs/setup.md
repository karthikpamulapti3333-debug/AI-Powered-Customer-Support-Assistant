# System Setup Guide - ResolveAI

Follow these steps to run ResolveAI on your local Windows system.

---

## 1. Prerequisites

Ensure you have the following software installed:
- **Python 3.11+**: Check with `python --version`
- **Java JDK 17 or 21**: Verify version using `java -version`
- **Node.js v18+ & npm**: For compilation of React assets (optional, see Docker instructions below)

---

## 2. Python AI Service Setup

The AI microservice handles NLP complaints classification and sentiment models.

### A. Install Dependencies
Open PowerShell inside `ResolveAI/ai-service` and run:
```powershell
pip install -r requirements.txt
```

### B. Generate Dataset and Train Models
Run the training script to programmatically create the synthetic dataset and fit the TF-IDF classifiers:
```powershell
python train.py
```
This saves joblib-serialized binaries under the `ai-service/models` directory.

### C. Launch FastAPI Server
Start Uvicorn to run the server on port `8000`:
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
You can verify it by opening `http://localhost:8000/api/ai/health` in your browser.

---

## 3. Spring Boot Backend Setup

The backend connects to H2 (default out-of-the-box development configuration) or MySQL.

### A. Compile and Package
Open PowerShell inside `ResolveAI/backend` and set the Java JDK path:
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
./mvnw clean compile package -DskipTests
```

### B. Run the Server
Launch the Spring Boot application using the default H2 profile:
```powershell
./mvnw spring-boot:run
```
For running with native MySQL, ensure your local MySQL server is active on port 3306, and start with the `mysql` profile:
```powershell
$env:SPRING_PROFILES_ACTIVE="mysql"
./mvnw spring-boot:run
```
Swagger UI will be active at: `http://localhost:8080/swagger-ui.html`

---

## 4. React Frontend Setup

The frontend connects to the backend proxy port.

### A. Install Packages
Open PowerShell inside `ResolveAI/frontend` and run:
```powershell
npm install
```

### B. Launch Vite Dev Client
```powershell
npm run dev
```
Open `http://localhost:5173` in your browser to interact with the platform.

---

## 5. Docker Compose Setup

If Docker Desktop is installed, you can launch all services (MySQL, FastAPI, Spring Boot, React) simultaneously:
1. Build the Spring Boot backend JAR first (`./mvnw package -DskipTests`).
2. Run from the root `ResolveAI` folder:
```bash
docker-compose up --build
```
This maps the React frontend to `http://localhost:5173` and binds the MySQL port.

---

## 6. Demonstration Login Credentials

Use the following development accounts to test the different role-based views:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **System Admin** | `admin` | `admin123` | Configure categories, departments, SLA rules, and solutions. |
| **Support Manager** | `manager` | `manager123` | View Recharts dashboards, track SLA breaches, reassign tickets. |
| **Billing Agent** | `agent_billing` | `agent123` | Resolve billing & payment issues and view AI recommender playbooks. |
| **Customer** | `customer` | `customer123` | Submit new tickets and check AI classification scores. |
