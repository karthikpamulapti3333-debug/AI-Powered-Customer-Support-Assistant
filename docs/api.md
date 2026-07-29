# REST API Reference - ResolveAI

ResolveAI APIs require a bearer JWT header for authentication (passed as `Authorization: Bearer <JWT_TOKEN>`), except for public login and register endpoints.

---

## 1. Authentication APIs

### Register Account
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "securepassword",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "CUSTOMER"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "User registered successfully!"
}
```

### User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "jane_doe",
  "password": "securepassword"
}
```
- **Response** (`200 OK`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "id": 6,
  "username": "jane_doe",
  "email": "jane@example.com",
  "roles": ["ROLE_CUSTOMER"]
}
```

### Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated
- **Response** (`200 OK`):
```json
{
  "id": 6,
  "username": "jane_doe",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "department": null,
  "roles": [{"id": 4, "name": "ROLE_CUSTOMER"}]
}
```

---

## 2. Complaint Management APIs

### Create Complaint
- **Endpoint**: `POST /api/complaints`
- **Access**: Customer
- **Request Body**:
```json
{
  "title": "Payment failed but money debited",
  "description": "My credit card was charged 450 dollars but transaction gave an error ORD-1002"
}
```
- **Response** (`200 OK`): Matches the detailed ticket schema (includes AI predictions).

### Get Complaints
- **Endpoint**: `GET /api/complaints`
- **Access**: All Roles (Filters list by ownership role)
- **Parameters** (Optional):
  - `status`: Filter by status (`NEW`, `IN_PROGRESS`, `RESOLVED`, etc.)
  - `priority`: Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `categoryId`: Filter by Category PK ID
  - `escalationStatus`: Filter by `HIGH_RISK` or `ESCALATED`
  - `search`: Keyword string matching title/description
- **Response** (`200 OK`): Array of complaints.

### Update Status
- **Endpoint**: `PUT /api/complaints/{id}/status`
- **Access**: Agent, Manager, Admin
- **Query Param**: `status=RESOLVED`
- **Response** (`200 OK`): Updated complaint.

---

## 3. Analytics APIs
*Requires `ROLE_MANAGER` or `ROLE_ADMIN` privileges.*

- **Summary Statistics**: `GET /api/analytics/summary`
- **Category Share**: `GET /api/analytics/categories`
- **Sentiment Share**: `GET /api/analytics/sentiment`
- **Priority Count**: `GET /api/analytics/priority`
- **SLA performance**: `GET /api/analytics/sla`
- **Agent Workloads**: `GET /api/analytics/agents`
- **Trends History**: `GET /api/analytics/trends`
