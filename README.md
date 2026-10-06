# DT — Deployment Tools
## Nova-Orchestrator

> A modern SRE/DevOps deployment control center for Chef, SaltStack, FastAPI, infrastructure environments, and AI-assisted deployment automation.

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
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License">
</p>

---

## Overview

**Deployment Tools (DT)** is an enterprise-grade Site Reliability Engineering (SRE) and deployment orchestration platform that unifies configuration management across **Chef** (pull-based, idempotent Ruby cookbooks) and **SaltStack** (push-based, high-speed ZeroMQ YAML state formulas).

The platform bridges infrastructure code and human operations through **Nova**, an autonomous AI copilot powered by **Google Gemini 3.8 Flash**, featuring a hands-free live voice command center, persistent chat history, and safety-gated execution plans.

### Core Objectives

* **Dual-Engine Orchestration**: Manage infrastructure with either Chef, SaltStack, or hybrid rollouts across web proxies (Nginx), API application servers (FastAPI), databases (PostgreSQL), and monitoring clusters (Prometheus).
* **Autonomous SRE Copilot**: Consult with Nova AI to generate syntax-validated deployment plans, inspect cookbooks and states, and audit fleet health.
* **Safety First**: Infrastructure-changing actions require explicit operator confirmation before execution.
* **Separation of Concerns**: Client browsers interface strictly with the FastAPI backend; configuration management code remains isolated, and secrets never touch frontend code.

---

## Architecture

```text
                    ┌─────────────────────────┐
                    │      DT Frontend        │
                    │      React + Vite       │
                    │       frontend/         │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      FastAPI Backend    │
                    │        backend/         │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
        ┌──────────┐       ┌──────────┐       ┌──────────┐
        │   Chef   │       │ SaltStack│       │ Nova AI  │
        │  chef/   │       │  salt/   │       │  Gemini  │
        └──────────┘       └──────────┘       └──────────┘
                                 │
                                 ▼
                      ┌────────────────────┐
                      │   environments/    │
                      │ dev/staging/prod   │
                      └────────────────────┘
```

### Directory Roles

* **`frontend/`**: Modern React single-page application built with Vite, Tailwind CSS, Lucide icons, and the official DT branding suite.
* **`backend/`**: High-performance FastAPI application managing REST endpoints, asynchronous SQLAlchemy ORM sessions, database migrations, and orchestration workers.
* **`chef/`**: Version-controlled Chef cookbooks containing idempotent recipes for Nginx, FastAPI app server, PostgreSQL, and Prometheus.
* **`salt/`**: SaltStack state formulas (`.sls`) and pillar configuration trees for push-based cluster convergence.
* **`environments/`**: Declarative YAML cluster definitions mapping target nodes across `dev`, `staging`, and `production`.

### Communication Flow

1. **Frontend to Backend**: React (Vite) interacts with the FastAPI REST API over HTTP/JSON (`/api/v1/`) and WebSocket connections for live logs and telemetry.
2. **Backend to AI**: FastAPI communicates securely with Google Gemini (`gemini-3.8-flash`) using a server-side `GEMINI_API_KEY`.
3. **Backend to Infrastructure Code**: FastAPI reads, validates, and simulates execution of cookbooks (`chef/`) and state formulas (`salt/`) mapped to environment definitions (`environments/`).

---

## Repository Structure

```text
backend/          FastAPI API and orchestration
chef/             Chef cookbooks and recipes
environments/     Development/staging/production configuration
frontend/         React/Vite UI
salt/             SaltStack states and pillar
assets/logo/      DT SVG brand assets
.github/          CI workflows
Dockerfile        Standard Docker deployment
Dockerfile.vercel Vercel container deployment if required
vercel.json       Vercel configuration
```

### Complete File Hierarchy

```text
/
├── assets/
│   └── logo/
│       ├── dt-logo.svg           # Primary DT brand lockup with vector typography
│       ├── dt-logo-white.svg     # Monochrome white brand lockup for dark backgrounds
│       └── dt-mark.svg           # Standalone geometric DT monogram mark
├── backend/
│   ├── api/
│   │   └── index.py              # Vercel Serverless Function entrypoint
│   ├── app/
│   │   ├── api/                  # auth, servers, deployments, configs, ai
│   │   ├── core/                 # settings, database normalizer, security, seed
│   │   ├── models/               # SQLAlchemy ORM schemas
│   │   ├── services/             # chef_service, salt_service, health_service
│   │   └── main.py               # FastAPI application setup
│   ├── main.py                   # Root ASGI export module
│   ├── requirements.txt          # Python dependencies (FastAPI, SQLAlchemy, asyncpg)
│   ├── vercel.json               # Backend serverless rewrite configuration
│   └── .env.example              # Backend environment template
├── chef/
│   └── cookbooks/
│       ├── app_server/           # FastAPI application server recipe (Ruby)
│       ├── monitoring/           # Prometheus & Node Exporter recipe (Ruby)
│       ├── nginx/                # Nginx reverse proxy recipe (Ruby)
│       └── postgresql/           # PostgreSQL database recipe (Ruby)
├── environments/
│   ├── dev.yaml                  # Local development cluster definition
│   ├── staging.yaml              # Pre-production validation environment
│   └── production.yaml           # Multi-node production infrastructure
├── frontend/
│   ├── public/
│   │   └── assets/logo/          # Served static DT SVG assets & favicon
│   ├── src/
│   │   ├── components/           # UI components, modals, live console, AI views
│   │   ├── pages/                # Dashboard, Deployments, Servers, Configs, History
│   │   └── services/             # Axios API client layer
│   ├── package.json              # Node.js dependencies and build scripts
│   └── .env.example              # Frontend environment template
├── salt/
│   ├── pillar/                   # SaltStack pillar data trees
│   └── states/                   # SLS formulas: top, common, nginx, app_server, etc.
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI workflow with SVG validation
├── .dockerignore                 # Container build exclusion rules
├── .gitignore                    # Git ignore specifications
├── Dockerfile                    # Standard production and local container definition
├── Dockerfile.vercel             # Stateless container definition for Vercel
├── vercel.json                   # Root monorepo Vercel configuration
└── README.md                     # Comprehensive platform documentation
```

---

## Features

| Feature | Implementation Status | Description |
| :--- | :--- | :--- |
| **DT Brand Identity** | REAL | Minimalist geometric DT monogram and vector wordmarks in `assets/logo/`. |
| **FastAPI REST API** | REAL | Full CRUD for servers, deployments, audit records, and auth with JWT. |
| **Cluster Telemetry** | REAL | Real socket health checks on ports 22, 80, 5432, 8000, 9090 (<1s parallel probe). |
| **Cookbook & State Viewer** | REAL | Dynamic syntax inspection of Ruby recipes and Salt YAML SLS files. |
| **Nova AI Copilot** | REAL | Gemini 3.8 Flash SRE reasoning, automated plan generation, and fallback logic. |
| **Live Voice Interaction** | REAL | Web Speech API speech recognition with interim/final separation and SpeechSynthesis TTS. |
| **Persistent Chat History** | REAL | Chronological message log, plan confirmation cards, auto-scroll with new-message pill. |
| **Environment Management** | REAL | Declarative YAML targeting for dev, staging, and production tiers. |
| **Deployment Wizard** | REAL | Guided modal for selecting target hosts, recipes/states, and execution strategy. |
| **Deployment Logs** | REAL | Real-time log streaming with phase timers and ANSI color rendering. |
| **Audit History** | REAL | Persistent record of all executed deployments with operator attributions. |
| **Responsive Mobile UI** | REAL | Responsive layouts with desktop multi-column and stacked mobile command center. |
| **Deployment Execution Engine** | DEVELOPMENT / SIMULATION MODE | Simulates realistic Chef runlists and Salt highstates with convergence logs and phase timers when physical bare-metal or cloud targets are absent. |
| **Chef Server Integration** | DEVELOPMENT / SIMULATION MODE | Simulates knife/chef-zero runs with idempotency checks against local cookbook files. |
| **Salt Master Integration** | DEVELOPMENT / SIMULATION MODE | Simulates ZeroMQ minion returns (`state.apply`) using local state declarations. |

---

## Database Architecture

The backend utilizes **SQLAlchemy 2.0 (AsyncIO)** with automatic connection string normalization.

```text
FastAPI Backend
       │
       ▼
  DATABASE_URL
       │
       ▼
PostgreSQL / Neon (Production)  ──OR──  SQLite + aiosqlite (Development)
```

### Driver & Dialect Support

* **Production (PostgreSQL / Neon)**: The backend automatically converts standard `postgresql://` and `postgres://` connection strings into `postgresql+asyncpg://` and strips incompatible parameters (such as `channel_binding`), enabling direct compatibility with connection poolers.
* **Development (Local SQLite)**: Uses `sqlite+aiosqlite:///./deployment_tools.db` for zero-configuration local development.

> **CRITICAL SECURITY RULE**:
> The database connection is **backend-only**. Never expose `DATABASE_URL` to the React client. Database credentials must never be committed to Git.

---

## Vercel Architecture

Deployment Tools can be hosted on Vercel as two coordinated services or a unified monorepo:

```text
GitHub
   │
   ▼
 Vercel
   │
   ├── frontend/
   │      React + Vite (Static Edge Hosting)
   │
   └── backend/
          FastAPI (Python Serverless Functions / Containers)
             │
             ▼
        PostgreSQL / Neon (External Cloud Database)
```

### Important Architecture Constraints

* **`chef/`**, **`salt/`**, and **`environments/`** remain version-controlled repository assets inspected by backend services. They are not standalone Vercel frontend applications.
* The frontend interacts with the backend over REST endpoints (`/api/v1/`).
* Chef and SaltStack convergence runs in **Development / Simulation Mode** when hosted in serverless cloud environments that do not have direct Layer 2/3 network routes to target bare-metal virtual machines.

---

## Gemini & Security Directives

Nova AI features enterprise security controls:

* **Backend-Only Gemini Key**: The `GEMINI_API_KEY` exists strictly on the backend (`backend/.env` or hosting provider environment settings).
* **No Client Exposure**: Storing Gemini API keys in frontend environment variables or client code is strictly prohibited. The browser bundle contains zero Gemini credentials.
* **Explicit Operator Authorization**: Nova formulate and analyzes deployment plans, but **no infrastructure changes are executed automatically**. Every proposed rollout creates a pending plan card that requires the human operator to click **Confirm & Deploy**.

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

The repository provides two production Docker configurations:

### 1. Standard Production Container (`Dockerfile`)

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

### 2. Vercel Container (`Dockerfile.vercel`)

```bash
# Build Vercel stateless container
docker build -f Dockerfile.vercel -t nova-orchestrator-vercel .
```

---

## CI/CD Pipeline

Automated checks run on every push and pull request via `.github/workflows/ci.yml`:

1. **Backend Validation**: Verifies Python bytecode compilation, dependency resolution, and FastAPI application initialization.
2. **Frontend Validation**: Installs dependencies via `npm ci` and builds the production Vite bundle (`npm run build`).
3. **Configuration & Spec Validation**: Validates YAML syntax across `environments/*.yaml` and `vercel.json`.
4. **SVG Brand Logo Validation**: Verifies `dt-logo.svg`, `dt-logo-white.svg`, and `dt-mark.svg` are valid XML, contain valid `viewBox` attributes, have zero raster/base64 data, and contain zero secrets.
5. **Docker Image Build**: Validates that the container images build without errors.

---

## License

This project is licensed under the MIT License.
