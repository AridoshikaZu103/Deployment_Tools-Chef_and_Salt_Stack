# Nova-Orchestrator

> A modern SRE/DevOps deployment control center for Chef, SaltStack, FastAPI, infrastructure environments, and AI-assisted deployment automation.

---

## Overview

**Nova-Orchestrator** is an enterprise-grade Site Reliability Engineering (SRE) and deployment automation platform that unifies configuration management across **Chef** (pull-based, idempotent Ruby cookbooks) and **SaltStack** (push-based, high-speed ZeroMQ YAML state formulas).

The platform bridges infrastructure code and human operations through **Nova**, an autonomous AI copilot powered by **Google Gemini 3.8 Flash**, featuring a hands-free live voice command center, persistent chat history, and safety-gated execution plans.

### Core Objectives

* **Dual-Engine Orchestration**: Manage infrastructure with either Chef, SaltStack, or hybrid rollouts across web proxies, API application nodes, databases, and monitoring clusters.
* **Autonomous SRE Copilot**: Consult with Nova AI to generate syntax-validated deployment plans, inspect cookbooks and states, and audit fleet health.
* **Safety First**: Infrastructure-changing actions require explicit operator confirmation before execution.
* **Separation of Concerns**: Client browsers interface strictly with the FastAPI backend; configuration management code remains isolated, and secrets never touch frontend code.

---

## Architecture

```text
                    +-------------------------+
                    |      React Frontend     |
                    |       frontend/         |
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
                    |      FastAPI Backend    |
                    |        backend/         |
                    +------------+------------+
                                 |
               +-----------------+-----------------+
               v                 v                 v
        +------------+    +------------+    +--------------+
        |    Chef    |    | SaltStack  |    |   Nova AI    |
        |   chef/    |    |   salt/    |    |    Gemini    |
        +------------+    +------------+    +--------------+
                                 |
                                 v
                       +------------------+
                       |   environments/  |
                       | dev/staging/prod |
                       +------------------+
```

### Communication Flow

1. **Frontend to Backend**: React (Vite) interacts with the FastAPI REST API over HTTP/JSON (`/api/v1/`) and WebSocket connections for live logs and telemetry.
2. **Backend to AI**: FastAPI communicates securely with the Google Gemini API (`gemini-3.8-flash`) using a server-side `GEMINI_API_KEY`.
3. **Backend to Infrastructure Code**: FastAPI reads, validates, and simulates execution of cookbooks (`chef/`) and state formulas (`salt/`) mapped to environment definitions (`environments/`).

---

## Repository Structure

```text
/
+-- backend/                # FastAPI application, database models, and API routes
|   +-- app/
|   |   +-- api/            # auth, servers, deployments, configs, ai
|   |   +-- core/           # settings, database, security, initial seed
|   |   +-- models/         # SQLAlchemy schemas
|   |   +-- services/       # chef_service, salt_service, health_service
|   |   +-- main.py         # Application entry point
|   +-- requirements.txt    # Python dependencies
|   +-- .env.example        # Backend environment template
+-- chef/                   # Real Chef infrastructure cookbooks
|   +-- cookbooks/
|       +-- app_server/     # FastAPI app server recipe (Ruby)
|       +-- monitoring/     # Prometheus & Node Exporter recipe (Ruby)
|       +-- nginx/          # Nginx reverse proxy recipe (Ruby)
|       +-- postgresql/     # PostgreSQL database server recipe (Ruby)
+-- environments/           # Declarative cluster definitions
|   +-- dev.yaml            # Local development cluster mapping
|   +-- staging.yaml        # Pre-production validation environment
|   +-- production.yaml     # Live multi-node production infrastructure
+-- frontend/               # React 18 single-page application (Vite + Tailwind CSS)
|   +-- src/
|   |   +-- components/     # UI components, modals, live console, AI views
|   |   +-- pages/          # Dashboard, Deployments, Servers, Configs, History
|   |   +-- services/       # API client layer
|   +-- package.json        # Node.js dependencies and build scripts
|   +-- .env.example        # Frontend environment template
+-- salt/                   # Real SaltStack state formulas & pillar data
|   +-- pillar/             # Pillar data definitions
|   +-- states/             # SLS formulas: top, common, nginx, app_server, etc.
+-- .github/
|   +-- workflows/
|       +-- ci.yml          # Continuous integration workflow
+-- .dockerignore           # Container build exclusion rules
+-- .gitignore              # Repository git ignore specifications
+-- Dockerfile              # Standard production & local container definition
+-- Dockerfile.vercel       # Container definition for Vercel deployment model
+-- vercel.json             # Vercel deployment configuration
+-- README.md               # Project documentation
```

---

## Features

| Feature | Implementation Status | Description |
| :--- | :--- | :--- |
| **FastAPI REST API** | REAL | Full CRUD for servers, deployments, audit records, and auth with JWT. |
| **Cluster Telemetry** | REAL | Real socket health checks on ports 22, 80, 5432, 8000, 9090 (<1s parallel probe). |
| **Cookbook & State Viewer** | REAL | Dynamic syntax inspection of Ruby recipes and Salt YAML SLS files. |
| **Nova AI Copilot** | REAL | Gemini 3.8 Flash SRE reasoning, automated plan generation, and fallback logic. |
| **Live Voice Interaction** | REAL | Web Speech API speech recognition with interim/final separation and SpeechSynthesis TTS. |
| **Persistent Chat History** | REAL | Chronological message log, plan confirmation cards, auto-scroll with new-message pill. |
| **Environment Management** | REAL | Declarative YAML targeting for dev, staging, and production tiers. |
| **Deployment Execution Engine** | SIMULATION / DEV MODE | Simulates realistic Chef runlists and Salt highstates with convergence logs and phase timers when physical bare-metal or cloud targets are absent. |
| **Chef Server Integration** | SIMULATION / DEV MODE | Simulates knife/chef-zero runs with idempotency checks against local cookbook files. |
| **Salt Master Integration** | SIMULATION / DEV MODE | Simulates ZeroMQ minion returns (`state.apply`) using local state declarations. |

---

## Local Development

### Prerequisites

* Python 3.11 or 3.12
* Node.js 18+ or 20+
* npm 9+

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and supply GEMINI_API_KEY (optional, fallback available)

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be accessible at:
* API Root: `http://127.0.0.1:8000/`
* Swagger Docs: `http://127.0.0.1:8000/api/docs`
* Health Check: `http://127.0.0.1:8000/health`

### 2. Frontend Setup

In a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start Vite dev server
npm run dev
```

The application will be running at `http://127.0.0.1:5173/`.

---

## Environment Variables

### Backend (`backend/.env`)

```ini
# Database & Core
DATABASE_URL=sqlite+aiosqlite:///./deployment_tools.db
SECRET_KEY=your-production-secret-key-min-32-chars
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173"]

# Nova AI Copilot (Google Gemini 3.8 Flash)
# Obtain key at: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

### Frontend (`frontend/.env`)

```ini
# Frontend Environment Configuration
# All AI requests route securely through the FastAPI backend
VITE_API_URL=http://localhost:8000/api/v1
```

> **IMPORTANT SECURITY DIRECTIVE**:
> Never put `GEMINI_API_KEY` in frontend environment variables. Frontend client bundles are completely public. All AI requests must route through `POST /api/v1/ai/chat` on the FastAPI backend.

---

## Nova AI Copilot Workflow

Nova serves as an autonomous Site Reliability Engineer inside the deployment workflow:

```text
User / Operator
      |
      v
React Frontend (DevOpsAiAgent.jsx / LiveMode.jsx)
      |
      v
FastAPI Backend (POST /api/v1/ai/chat)
      |
      v
Google Gemini 3.8 Flash (Server-Side)
      |
      v
FastAPI Backend (Structured Validation & Plan Parsing)
      |
      v
React Frontend (Rendered Markdown + Actionable Plan Card)
      |
      v
Operator Explicit Confirmation ("Confirm & Deploy")
      |
      v
FastAPI Deployment Pipeline (POST /api/v1/deployments/)
```

### Safety Policy

Nova can formulate, analyze, and propose deployment plans. However, **no infrastructure changes are executed automatically**. Every proposed rollout creates a pending plan card that requires the human operator to click **Confirm & Deploy** or **Review**.

---

## Voice Architecture

The SRE command center provides hands-free voice operations via browser Web Speech APIs:

```text
Operator Microphone
        |
        v
Browser Speech Recognition (SpeechRecognition / webkitSpeechRecognition)
        |
        +---> [Interim Speech] ---> LIVE TRANSCRIPT Display Only
        |                           (Zero API calls, Zero Chat messages)
        v
[Final Speech Validated (isFinal === true)]
        |
        v
Atomic Lock Acquired (Blocks duplicate requests & race conditions)
        |
        v
Exactly ONE Operator Message added to CHAT HISTORY
        |
        v
FastAPI Backend (POST /api/v1/ai/chat)
        |
        v
Gemini 3.8 Flash Processing
        |
        v
Exactly ONE Nova Response added to CHAT HISTORY
        |
        v
Browser Speech Synthesis (SpeechSynthesisUtterance)
        |
        v
Audio Output (Can be cancelled immediately via "Stop Speaking")
```

### Voice Safeguards

* **Interim Filtering**: Partial speech results only update the `LIVE TRANSCRIPT` monitor.
* **No Accidental Submissions**: Only `event.results[i].isFinal === true` triggers backend submission.
* **Request Lock**: Concurrent submissions and speech restart loops are blocked.
* **Single TTS Output**: Nova speaks aloud exactly once per response; SpeechSynthesis queues are purged before each new utterance.
* **Shared History**: Both voice and text chat feed into the identical, persistent chat history container.

---

## Deployment

### Vercel Deployment

The repository includes a root `vercel.json` configured for a monorepo deployment:

* `frontend/` builds via `@vercel/static-build` using Vite into `dist`.
* `backend/` runs via `@vercel/python` targeting `backend/app/main.py`.
* `chef/`, `salt/`, and `environments/` remain version-controlled repository assets inspected by backend services.

> Note: While Vercel hosts the web dashboard and API endpoints, bare-metal convergence against remote VMs requires target network connectivity (e.g. SSH or ZeroMQ ports) or an external runner agent.

### Docker Deployment

The repository provides two purpose-built Docker configurations:

#### 1. Standard Production & Local Container (`Dockerfile`)

Built for standard local development, Docker Compose, or container runtimes (Kubernetes, AWS ECS, GCP Cloud Run):

```bash
# Build standard production container
docker build -t nova-orchestrator .

# Run container with dynamic port and healthcheck
docker run -d \
  --name nova-orchestrator \
  -p 8000:8000 \
  -e PORT=8000 \
  -e DATABASE_URL="sqlite+aiosqlite:///./deployment_tools.db" \
  -e SECRET_KEY="your-production-secret-key" \
  -e GEMINI_API_KEY="your-gemini-key" \
  nova-orchestrator
```

Key features:
* Uses official `python:3.12-slim` base image.
* Installs required system packages (`curl`, `openssh-client`, `ruby`).
* Includes native container `HEALTHCHECK` probing `http://localhost:${PORT:-8000}/health`.
* Copies only necessary backend and infrastructure source files.
* Excludes `.env`, `venv`, `node_modules`, and sensitive artifacts via `.dockerignore`.
* Runs Uvicorn in production mode without `--reload`, respecting `$PORT`.

#### 2. Vercel Container Deployment (`Dockerfile.vercel`)

Built for Vercel's compute container model:

```bash
# Validate Vercel container build
docker build -f Dockerfile.vercel -t nova-orchestrator-vercel .
```

Key features:
* Runs stateless ASGI HTTP server without local persistence dependencies.
* Listens on `$PORT` injected dynamically by Vercel runtime.
* Starts immediately without secondary daemons.
* Zero secrets or `.env` files copied into image layers.

---

## Security Audit & Compliance

* **Server-Side Secrets**: `GEMINI_API_KEY` is maintained exclusively on the backend server.
* **Client Isolation**: The React frontend bundle contains zero infrastructure keys or administrative credentials.
* **Git & Docker Sanitation**: `.gitignore` and `.dockerignore` strictly ignore all `.env`, `.env.*` (preserving `.env.example` templates), and local database files.
* **No Direct Shell Execution from Client**: The frontend cannot execute shell commands directly; all tasks route through authenticated FastAPI services.
* **Operator Authorization**: Rollout commands generated by the AI copilot demand manual confirmation.

---

## CI/CD Pipeline

Automated checks run on every push and pull request to `main`, `master`, and `develop` via `.github/workflows/ci.yml`:

1. **Backend Validation**:
   * Installs Python 3.12 dependencies from `backend/requirements.txt`.
   * Verifies Python bytecode compilation and clean FastAPI app initialization.
2. **Frontend Validation**:
   * Installs dependencies via `npm ci`.
   * Builds the production Vite bundle (`npm run build`).
3. **Configuration Validation**:
   * Validates YAML syntax across all `environments/*.yaml` files.
   * Validates `vercel.json` schema and route declarations.
4. **Docker Image Build**:
   * Validates both `Dockerfile` and `Dockerfile.vercel` container builds.

---

## License

This project is licensed under the MIT License.
