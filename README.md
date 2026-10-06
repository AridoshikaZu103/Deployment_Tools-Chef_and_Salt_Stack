# DT - Deployment Tools
## Nova-Orchestrator

> A modern SRE and DevOps deployment control center unifying Chef, SaltStack, FastAPI, PostgreSQL, and AI-assisted deployment automation.

<p align="center">
  <img src="./assets/logo/dt-logo.svg" alt="Deployment Tools" width="420">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Brand-DT%20Monogram-00f0ff?style=flat-square" alt="DT Brand">
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18.3+-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Chef-Cookbooks-F96854?style=flat-square&logo=chef&logoColor=white" alt="Chef">
  <img src="https://img.shields.io/badge/SaltStack-Formulas-5A6B82?style=flat-square&logo=saltproject&logoColor=white" alt="SaltStack">
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Neon-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/AI-Gemini%203.8%20Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/Tests-Pytest%20Passing-success?style=flat-square" alt="Pytest Passing">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License">
</p>

---

## Overview

**Deployment Tools (DT) / Nova-Orchestrator** is an enterprise-grade Site Reliability Engineering (SRE) and deployment orchestration platform. It unifies configuration management across **Chef** (pull-based, idempotent Ruby cookbooks) and **SaltStack** (push-based, high-speed ZeroMQ YAML state formulas), while providing a complete automated deployment lifecycle with pre-flight validation, live execution progress, cancellation, retries, and cascading deletion.

The platform bridges infrastructure code and human operations through **Nova**, an autonomous AI copilot powered by **Google Gemini 3.8 Flash**, featuring a hands-free live voice command center, persistent chat history, and safety-gated execution plans.

### Core Capabilities

* **Dual-Engine Orchestration**: Run deployments using Chef, SaltStack, or coordinated Hybrid workflows across web proxies (Nginx), API application servers (FastAPI), databases (PostgreSQL), and monitoring stacks (Prometheus).
* **Complete Deployment Lifecycle**: End-to-end execution pipeline supporting creation, automated pre-flight checks, step-by-step progress tracking, real-time log streaming, cancel, retry, and cascading delete.
* **Strict Engine Differentiation**: Dedicated execution models and telemetry for Chef vs SaltStack. SaltStack runs never output Chef logs; Chef runs never output Salt minion logs.
* **Autonomous SRE Copilot**: Nova AI provides syntax validation, deployment plan formulation, cookbook/state inspection, and cluster health auditing.
* **Safety First**: Infrastructure-modifying actions require explicit operator confirmation before execution.
* **High-Performance Asynchronous Backend**: FastAPI with SQLAlchemy 2.0 (AsyncIO), connection pool normalization for PostgreSQL/Neon, and decoupled worker sessions for resilient background execution.

---

## Architecture

```text
                    +-------------------------+
                    |      DT Frontend        |
                    |      React + Vite       |
                    |       frontend/         |
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
                    |      FastAPI Backend    |
                    |        backend/         |
                    +------------+------------+
                                 |
             +-------------------+-------------------+
             v                   v                   v
        +----------+       +----------+       +----------+
        |   Chef   |       | SaltStack|       | Nova AI  |
        |  chef/   |       |  salt/   |       |  Gemini  |
        +----------+       +----------+       +----------+
                                 |
                                 v
                      +--------------------+
                      |   environments/    |
                      | dev/staging/prod   |
                      +--------------------+
```

### Directory Roles

* **`frontend/`**: Modern React single-page application built with Vite, Tailwind CSS, Lucide icons, and the official DT branding suite.
* **`backend/`**: High-performance FastAPI application managing REST endpoints, asynchronous SQLAlchemy ORM sessions, database migrations, and orchestration workers.
* **`chef/`**: Version-controlled Chef cookbooks containing idempotent recipes for Nginx, FastAPI app server, PostgreSQL, and Prometheus.
* **`salt/`**: SaltStack state formulas (`.sls`) and pillar configuration trees for push-based cluster convergence.
* **`environments/`**: Declarative YAML cluster definitions mapping target nodes across `dev`, `staging`, and `production`.
* **`tests/`**: Comprehensive pytest test suite validating the complete deployment lifecycle, validation rules, cancel/retry states, and query filters.

---

## Deployment Lifecycle

The deployment engine follows a deterministic, state-machine driven pipeline:

```text
CREATE DEPLOYMENT (POST /api/v1/deployments/)
        |
        v
PRE-FLIGHT CHECKS (Targets, Engine, Recipes/States, Credentials)
        |
        +---> [VALIDATION ERROR: 422]
        |
        v
DEPLOYMENT PLAN GENERATION (Steps initialized in DB with PENDING status)
        |
        v
BACKGROUND WORKER EXECUTION
        |
        v
STEP-BY-STEP PROGRESS (RUNNING -> SUCCESS / FAILED / CANCELLED)
        |
        v
REAL-TIME SSE / LOG STREAMING
        |
        +---> CANCEL (POST /api/v1/deployments/{id}/cancel)
        +---> RETRY  (POST /api/v1/deployments/{id}/retry)
        +---> DELETE (DELETE /api/v1/deployments/{id})
```

### Lifecycle States

* **`pending`**: Deployment registered; pre-flight validations completed; execution queue initialized.
* **`running`**: Steps executing sequentially or concurrently across target nodes.
* **`success`**: All steps converged and node verification confirmed.
* **`failed`**: One or more steps failed execution; failure message and stderr logged.
* **`cancelled`**: Operator aborted execution; active workers halted gracefully.

---

## Chef vs SaltStack Engine Comparison

Why Chef is not equal to SaltStack:

| Feature / Dimension | Chef Orchestration | SaltStack Orchestration | Hybrid Mode |
| :--- | :--- | :--- | :--- |
| **Architectural Model** | Pull-based (client convergence) | Push-based (event-driven) | Two-stage coordinated |
| **Language & Syntax** | Ruby DSL | YAML with Jinja templating | Ruby + YAML |
| **Transport Layer** | HTTPS REST API / chef-client | ZeroMQ message bus / SSH | ZeroMQ + HTTPS |
| **Configuration Unit** | Cookbooks, Recipes, Attributes | Formulas, SLS states, Pillars | Recipes followed by SLS |
| **Run Identifier** | `recipe[<cookbook>::default]` | `state.apply` / `top.sls` | Recipe + State list |
| **Target Targeting** | Roles, Environments, Runlists | Minion IDs, Grains, Compound matching | Shared target list |
| **Telemetry & Logs** | Compiling resource collection, converging recipes, chef-client exit codes | ZeroMQ minion returns, Highstate SLS execution, Pillar compilation | Sequenced Chef prep logs then Salt convergence logs |

---

## Database Architecture

The backend utilizes **SQLAlchemy 2.0 (AsyncIO)** with automatic connection string normalization.

```text
FastAPI Backend
       |
       v
  DATABASE_URL
       |
       v
PostgreSQL / Neon (Production)  --OR--  SQLite + aiosqlite (Development / Fallback)
```

### Driver & Dialect Support

* **Production (PostgreSQL / Neon)**: Automatically converts standard `postgresql://` and `postgres://` connection strings into `postgresql+asyncpg://` and strips unsupported pooling parameters, ensuring clean compatibility with cloud connection poolers.
* **Worker Decoupling**: Background deployment executor tasks utilize independent `AsyncSessionLocal(expire_on_commit=False)` sessions, preventing greenlet and session contention across concurrent requests.
* **Development (Local SQLite)**: Falls back gracefully to `sqlite+aiosqlite:///./deployment_tools.db` when no external database is configured.

---

## API Endpoints

### Deployments

* `POST /api/v1/deployments/`: Create and trigger a new deployment with pre-flight checks.
* `GET /api/v1/deployments/`: List deployments with optional filters (`environment`, `status`, `engine`, `limit`).
* `GET /api/v1/deployments/{id}`: Retrieve detailed deployment state including step progress and execution logs.
* `POST /api/v1/deployments/{id}/cancel`: Cancel an active or pending deployment.
* `POST /api/v1/deployments/{id}/retry`: Reset and restart an existing deployment.
* `DELETE /api/v1/deployments/{id}`: Delete deployment with cascading removal of steps and log entries.
* `GET /api/v1/deployments/{id}/logs`: Retrieve structured deployment logs.

### Servers & Telemetry

* `GET /api/v1/servers/`: List managed cluster nodes with live socket health telemetry.
* `GET /api/v1/servers/health`: Run live health probes on ports 22, 80, 5432, 8000, 9090.

### Cookbooks & States

* `GET /api/v1/configs/cookbooks`: Inspect available Chef cookbooks and metadata.
* `GET /api/v1/configs/states`: Inspect available SaltStack state formulas and pillars.

### Nova AI Copilot

* `POST /api/v1/ai/chat`: Send conversational SRE queries to Nova (Gemini 3.8 Flash).
* `POST /api/v1/ai/plan`: Generate structured deployment rollout plans from natural language.

---

## Automated Testing Suite

The backend includes a comprehensive pytest suite covering all deployment workflows:

```bash
# Run deployment lifecycle tests from workspace root
.\venv\Scripts\python.exe -m pytest tests/test_deployments.py -v
```

### Test Coverage

1. **`test_create_deployment_success`**: Validates creation, pre-flight checks, step initialization, and target assignment for Chef, Salt, and Hybrid engines.
2. **`test_create_deployment_validation_failures`**: Verifies strict 422 HTTP validation when invalid engines or empty target lists are submitted.
3. **`test_cancel_and_retry_flow`**: Validates state machine transitions from running to cancelled, and subsequent retry execution.
4. **`test_list_deployments_filters`**: Verifies query filtering by environment (`production`, `staging`, `dev`) and status (`running`, `success`, `failed`).

---

## Local Development Quickstart

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
# Edit .env and supply GEMINI_API_KEY and DATABASE_URL

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be accessible at:
* API Root: `http://127.0.0.1:8000/`
* API v1: `http://127.0.0.1:8000/api/v1`
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

## Docker Deployment

### 1. Standard Production Container (`Dockerfile`)

Build and run the production FastAPI backend container:

```bash
# Build standard production container
docker build -t nova-orchestrator .

# Run container with healthcheck
docker run -d \
  --name nova-orchestrator \
  -p 8000:8000 \
  -e PORT=8000 \
  -e DATABASE_URL="postgresql://neondb_owner:password@host/neondb?sslmode=require" \
  -e SECRET_KEY="your-production-secret-key" \
  -e GEMINI_API_KEY="your-gemini-key" \
  nova-orchestrator
```

### 2. Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Optional | `sqlite+aiosqlite:///./deployment_tools.db` | PostgreSQL or Neon connection string |
| `SECRET_KEY` | Yes | - | Secret key for JWT signing |
| `GEMINI_API_KEY` | Optional | - | Google Gemini API key for Nova AI |
| `PORT` | Optional | `8000` | Port for ASGI server execution |
| `PYTHONPATH` | Optional | `/app` | Python module import path |

---

## CI/CD Pipeline

Automated checks run on every push and pull request via `.github/workflows/ci.yml`:

1. **Backend Validation**: Verifies Python bytecode compilation, dependency resolution, and FastAPI application initialization.
2. **Frontend Validation**: Installs dependencies via `npm ci` and builds the production Vite bundle (`npm run build`).
3. **Configuration & Spec Validation**: Validates YAML syntax across `environments/*.yaml` and `vercel.json`.
4. **Brand Asset Validation**: Verifies `dt-logo.svg`, `dt-logo-white.svg`, and `dt-mark.svg` are valid XML with clean vector definitions.
5. **Docker Image Build**: Validates that container images build without errors.

---

## License

This project is licensed under the MIT License.
