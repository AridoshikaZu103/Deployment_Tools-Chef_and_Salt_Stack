# 🚀 Deployment Tools — Chef & Salt Stack

A full-stack deployment management platform that orchestrates infrastructure provisioning using **Chef** (Ruby) and **Salt Stack** (YAML/Python), managed through a **React** dashboard and **FastAPI** backend.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Dashboard · Live Logs · Config Editor · Health Checks   │
├─────────────────────────────────────────────────────────┤
│                  Backend (FastAPI/Python)                 │
│  REST API · Job Queue · WebSocket Logs · Auth            │
├──────────────────────┬──────────────────────────────────┤
│   Chef (Ruby)        │       Salt Stack (YAML/Python)    │
│  Cookbooks/Recipes   │       States/Pillars/Formulas     │
├──────────────────────┴──────────────────────────────────┤
│              Target Infrastructure                       │
│  Nginx · FastAPI App · PostgreSQL · Prometheus           │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── frontend/                  # React + Tailwind CSS dashboard
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level views
│   │   ├── services/          # API client layer
│   │   └── App.jsx            # Root component
│   └── package.json
│
├── backend/                   # FastAPI Python server
│   ├── app/
│   │   ├── api/               # REST endpoint routers
│   │   ├── core/              # Config, security, DB
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/          # Chef/Salt orchestration
│   │   └── main.py            # Application entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── chef/                      # Chef cookbooks (Ruby)
│   └── cookbooks/
│       ├── nginx/             # Nginx web server cookbook
│       ├── app_server/        # FastAPI app server cookbook
│       ├── postgresql/        # PostgreSQL database cookbook
│       └── monitoring/        # Prometheus monitoring cookbook
│
├── salt/                      # Salt Stack configs
│   ├── states/                # Salt state files (YAML)
│   ├── pillar/                # Environment-specific data
│   └── _modules/              # Custom Python modules
│
└── environments/              # Environment configs
    ├── dev.yaml
    ├── staging.yaml
    └── production.yaml
```

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Frontend       | React 18, Tailwind CSS, Vite      |
| Backend        | FastAPI, SQLAlchemy, Celery        |
| Config Mgmt    | Chef (Ruby), Salt Stack (YAML/Py) |
| Database       | PostgreSQL (+ SQLite for dev)      |
| Monitoring     | Prometheus + Grafana               |
| Web Server     | Nginx                             |

## Environments

| Environment | Purpose                              |
|-------------|--------------------------------------|
| Development | Local testing, SQLite, debug mode    |
| Staging     | Pre-production validation            |
| Production  | Live infrastructure, full monitoring |

## License

MIT
