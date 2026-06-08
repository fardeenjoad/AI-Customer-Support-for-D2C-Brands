# ResolveIQ Support Platform

ResolveIQ is a production-level, multi-brand customer support platform designed for D2C (Direct-to-Consumer) brands. It features automated AI responses using the Groq API (llama3-70b-8192 model), sentiment analysis, ticket management, human agent routing, email alerts via Resend API, rate limiting, and analytics.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Tech Stack](#tech-stack)
4. [Setup & Installation](#setup--installation)
5. [API Documentation](#api-documentation)
6. [Deployment Guide (Railway & Render)](#deployment-guide-railway--render)

---

## Project Overview

ResolveIQ helps D2C brands scale customer support by filtering and responding to queries using brand-specific context (FAQs, tone, and greetings). 
- **AI Chatbot Routing**: Resolves common D2C queries using the brand's knowledge base.
- **Sentiment & Intent Analysis**: Dynamically detects query intent (`refund`, `complaint`, `query`, `general`) and customer sentiment. Sets ticket urgency to high/urgent and auto-escalates to human agent queues if a negative sentiment or refund request is detected.
- **Admin & Agent Panel**: Allows admins and agents to filter, paginate, assign, resolve, and trace ticket lifecycles.
- **Transactional Notifications**: Dispatches branded HTML emails upon ticket creation, resolution, or agent assignment using the Resend API.
- **Production Polish**: Rate-limited using the `slowapi` library, standard logger trace middleware, and consistent JSON response formatting for all endpoints.

---

## Architecture Diagram

```
                 +-------------------+
                 |    Web Client     |
                 +---------+---------+
                           |  (HTTP Requests)
                           v
                 +---------+---------+
                 | FastAPI Web Server|  <---> [ Request Logging Middleware ]
                 +---------+---------+  <---> [ SlowAPI Rate Limiter ]
                           |
            +--------------+--------------+
            |                             |
            v                             v
  +---------+---------+         +---------+---------+
  |  Routers Layer    |         | Exception Handlers| --(Returns Standard Envelope)
  |                   |         +-------------------+
  | - auth.py         |
  | - chat.py         |
  | - tickets.py      |
  | - admin.py        |
  +---------+---------+
            |
            v
  +---------+---------+         +-------------------+
  |  Services Layer   | <-----> |   AI Engines      |
  |                   |         | - Groq LLM API    |
  | - ai_service.py   |         +-------------------+
  | - sentiment_sys   |
  | - email_service   | <-----> |   Email Gateway   |
  +---------+---------+         | - Resend API      |
            |                   +-------------------+
            v
  +---------+---------+
  | Repository Pattern|
  |                   |
  | - brand_repo.py   |
  | - ticket_repo.py  |
  | - message_repo.py |
  | - user_repo.py    |
  +---------+---------+
            |
            v
  +---------+---------+
  |  Supabase Client  |
  +---------+---------+
            |
            v
  +---------+---------+
  |  PostgreSQL DB    |
  +-------------------+
```

---

## Tech Stack
- **Backend Framework**: Python 3.11/3.13 + FastAPI
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Groq API (`llama3-70b-8192`)
- **Email Gateway**: Resend API
- **Authentication**: JWT (python-jose + passlib)
- **Validation**: Pydantic v2
- **HTTP Client**: httpx (async)
- **Rate Limiting**: slowapi (limits token bucketing)
- **Server**: Uvicorn

---

## Setup & Installation

### 1. Prerequisites
Ensure you have Python 3.11+ installed.

### 2. Clone and Setup Environment
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```
Update `.env` with your API keys and credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GROQ_API_KEY=gsk_your_groq_api_key
RESEND_API_KEY=re_your_resend_api_key
JWT_SECRET=your_jwt_secret_key_change_me_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAX_UPLOAD_BYTES=5242880
ALLOWED_UPLOAD_CONTENT_TYPES=image/png,image/jpeg,image/webp,application/pdf,text/plain
PASSWORDLESS_PORTAL_ENABLED=true
```

For production, set `ENVIRONMENT=production` and replace all localhost/placeholder values with deployed URLs and real provider credentials. Startup intentionally fails in production if:
- `JWT_SECRET`, Supabase, CORS, frontend/backend base URLs, email, AI, or S3 attachment storage are not configured.
- `PASSWORDLESS_PORTAL_ENABLED=true`. The current customer portal uses email-only ticket lookup and must be disabled or replaced with OTP/magic-link verification before public launch.

### 3. Install Dependencies
Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/Scripts/activate  # On Linux/macOS use: source venv/bin/activate
pip install -r requirements.txt
```

### 4. Database Schema Setup
Execute the SQL statements inside `schema.sql` within your Supabase project's SQL Editor to create tables (`brands`, `users`, `agent_brands`, `tickets`, `messages`) and seed initial brand configurations.

### 5. Running the Server Locally
Start the server using uvicorn:
```bash
uvicorn app.main:app --reload
```
The API documentation will be available at:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## API Documentation

All API responses strictly adhere to the following standard JSON envelope format:
```json
{
  "success": true,
  "data": {},
  "message": "Response message detail."
}
```

### 1. Authentication (`/auth`)
* **`POST /auth/register`**: Register a customer account under a brand.
  * **Rate Limit**: `5/minute`
* **`POST /auth/login`**: Authenticate credentials and get a bearer JWT.
  * **Rate Limit**: `5/minute`
* **`GET /auth/me`**: Get active user's profile info.
  * **Rate Limit**: `30/minute`

### 2. Support Chatbot (`/chat`)
* **`POST /chat`**: Message the AI chatbot. Dynamically updates tickets, runs sentiment checks, and triggers auto-escalations.
  * **Rate Limit**: `5/minute`
* **`GET /chat/{ticket_id}/history`**: Fetch conversation message history.
  * **Rate Limit**: `30/minute`
  * **Pagination**: `page` (default: 1), `limit` (default: 20)

### 3. Ticket Management (`/tickets`)
* **`POST /tickets`**: Creates a support ticket with an initial message.
  * **Rate Limit**: `5/minute`
* **`GET /tickets`**: List tickets. Scoped to current role (Customers see own, Agents see brand-assigned, Admins see all).
  * **Rate Limit**: `20/minute`
  * **Filters**: `status_filter`, `priority_filter`, `brand_filter`
  * **Pagination**: `page` (default: 1), `limit` (default: 10)
* **`GET /tickets/{ticket_id}`**: Retrieves single ticket details along with full message thread history.
  * **Rate Limit**: `30/minute`
* **`PUT /tickets/{ticket_id}`**: Update ticket status, priority, or assignment (Admins/Agents only).
  * **Rate Limit**: `20/minute`
* **`DELETE /tickets/{ticket_id}`**: Soft-deletes a ticket.
  * **Rate Limit**: `10/minute`

### 4. Administration panel (`/admin`)
* **`GET /admin/tickets`**: Retrieve all tickets with pagination and filtering. Restricted to Admins.
  * **Rate Limit**: `30/minute`
* **`POST /admin/assign`**: Assigns a ticket to a support agent.
  * **Rate Limit**: `10/minute`
* **`GET /admin/analytics`**: Computes dashboard analytics KPIs (CSAT, ticket volumes, sentiment, and common intents).
  * **Rate Limit**: `20/minute`
* **`GET /admin/alerts`**: Lists unresolved tickets older than 24 hours.
  * **Rate Limit**: `20/minute`
  * **Pagination**: `page` (default: 1), `limit` (default: 10)

### 5. Brand Management (`/admin/brands`)
* **`POST /admin/brands`**: Register a new brand with a custom tone (`formal`/`casual`), FAQs, greeting message, and email configs.
  * **Rate Limit**: `10/minute`
* **`GET /admin/brands`**: Lists all registered D2C brand configs.
  * **Rate Limit**: `30/minute`
  * **Pagination**: `page` (default: 1), `limit` (default: 10)
* **`GET /admin/brands/{brand_id}`**: Retrieves configuration details for a single brand by ID.
  * **Rate Limit**: `30/minute`
* **`PUT /admin/brands/{brand_id}`**: Update brand tone, greetings, email configuration, or FAQs.
  * **Rate Limit**: `10/minute`
* **`DELETE /admin/brands/{brand_id}`**: Deletes a brand configuration.
  * **Rate Limit**: `10/minute`

---

## Deployment Guide (Railway & Render)

### Option A: Deployment on Railway
1. **Connect Repository**: Sign in to [Railway.app](https://railway.app) and create a new project from your GitHub repository.
2. **Configure Variables**: In your Railway service settings, add all variables from your local `.env`.
3. **Configure Start Command**: Railway will automatically detect the Python environment. In the "Settings" tab, configure the **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   Required production variables include `ENVIRONMENT=production`, `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `JWT_SECRET`, Supabase credentials, an email provider, an AI provider, AWS S3 credentials, and `PASSWORDLESS_PORTAL_ENABLED=false` unless a verified portal auth flow has been implemented.
4. **Deploy**: Railway builds the container and makes the service live under an automated public URL.

### Option B: Deployment on Render
1. **Create Web Service**: Log in to [Render.com](https://render.com) and click **New > Web Service**. Link your GitHub repository.
2. **Environment settings**: Set **Environment** to `Python 3`.
3. **Build & Start Commands**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**: Add your environment variables under the "Environment" settings tab.
   Required production variables include `ENVIRONMENT=production`, `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `JWT_SECRET`, Supabase credentials, an email provider, an AI provider, AWS S3 credentials, and `PASSWORDLESS_PORTAL_ENABLED=false` unless a verified portal auth flow has been implemented.
5. **Deploy**: Click **Create Web Service** to deploy.
