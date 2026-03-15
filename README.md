<p align="center">
  <img src="logo.png" alt="fairly logo" width="320" />
</p>

<h1 align="center">fairly</h1>

<p align="center">
  <strong>Bias evaluation toolkit for Vision-Language Models (VLMs)</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#usage">Usage</a> •
  <a href="#team">Team</a>
</p>

---

## Overview

**fairly** is a Python library and experimentation platform for evaluating and mitigating biases in Vision-Language Models. Inspired by the developer experience of [MLflow](https://mlflow.org/), fairly lets you audit your own models (or third-party ones) through a fluent Python API _and_ an interactive local dashboard.

## Features

- **Dual interface** — programmatic Python API (`fairly.evaluate(...)`) and a local web dashboard (`fairly ui`).
- **Bring Your Own Model** — wrap any VLM behind a simple base class; native support for [Featherless.ai](https://featherless.ai/) models included.
- **Dynamic benchmarks** — prompts adapt to your dataset's metadata (gender, skin tone, age, etc.).
- **Stratified sampling** — cost-aware sampling to keep token usage under control.
- **Manual audit** — pass / flag individual model responses directly from the UI.
- **PDF export** — one-click report generation for stakeholders.
- **Local persistence** — all data stored in a `.fairly/` SQLite database, no external services needed.

## Quick Start

### 1. Install

```bash
pip install -e .
```

### 2. Launch the dashboard

```bash
fairly ui
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### 3. (Optional) Development mode with hot-reload

```bash
# Terminal 1 — Backend
fairly ui

# Terminal 2 — Frontend dev server (with hot-reload)
cd frontend
npm install
npm run dev
```

The Vite dev server at `http://localhost:5173` proxies API calls to the backend.

## Architecture

```
fairly/
├── frontend/              # React + TypeScript + shadcn/ui
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Dashboard, Models, Datasets, Benchmark, Evaluation, Settings
│       └── lib/           # API client, utilities
│
├── src/fairly/            # Python package
│   ├── cli.py             # `fairly ui` command (Typer)
│   ├── config.py          # Paths & environment config
│   ├── server/            # FastAPI backend + API routes
│   ├── db/                # SQLAlchemy ORM models, CRUD, seed data
│   ├── models/            # VLM client abstraction (base, featherless, custom)
│   ├── data/              # Dataset loaders (local, S3)
│   ├── eval/              # Benchmark builder & runner
│   └── reporting/         # PDF report generator
│
├── pyproject.toml         # Package config & dependencies
└── .env.example           # Environment variable template
```

## Usage

### From the UI

1. **Settings** — configure your Featherless / AWS keys.
2. **Models** — connect one or more VLMs.
3. **Datasets** — point to your images + CSV metadata.
4. **Benchmark** — pick model, dataset, domain, dimensions → **Run**.
5. **Results** — review metrics, audit individual responses, export PDF.

### From Python

```python
from fairly.models.custom import CustomModelClient
from fairly.eval.runner import run_evaluation
from fairly.db.database import SessionLocal, init_db
from fairly.db.seed import seed_all

# Initialise the database
init_db()
seed_all()

# Create a session and run an evaluation programmatically
db = SessionLocal()
evaluation = run_evaluation(db, evaluation_id=1)
print(f"Status: {evaluation.status}")
db.close()
```

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Backend   | Python, FastAPI, SQLAlchemy, SQLite     |
| Frontend  | React, TypeScript, Vite, shadcn/ui     |
| CLI       | Typer + Rich                            |
| Reporting | fpdf2                                   |
| Data      | pandas, boto3, Pillow                   |

## Team

### Core Members

- **Nicolás Alayo** — Co-creator & product engineer
- **Aleksandra Laskowska** — Co-creator & product strategist

## License

This project is licensed under the [MIT License](LICENSE).