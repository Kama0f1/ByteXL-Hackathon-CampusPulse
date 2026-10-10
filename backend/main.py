"""
Campus-Pulse - FastAPI entry point.

Serves the JSON API the Next.js frontend reads (payloads built by campus_service.py from
the seven CSVs in ../data), and can start the frontend too:

    python main.py               # API on http://127.0.0.1:8000  (docs at /docs)
    python main.py --frontend    # API + Next.js on http://127.0.0.1:3000

Settings come from environment variables or backend/.env (see .env.example).
Never commit keys: .env is git-ignored.
"""
from __future__ import annotations

import argparse
import atexit
import os
import shutil
import subprocess
import sys
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

# Make `uvicorn backend.main:app` work from the repo root as well as from /backend.
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

load_dotenv(BACKEND_DIR / ".env")

import campus_service  # noqa: E402  (needs BACKEND_DIR on sys.path)

FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

# --------------------------------------------------------------------------- #
# app
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        campus = campus_service.get_campus()
        print(f"Campus-Pulse: {len(campus.students)} students loaded and scored.")
    except Exception as exc:  # keep the API up so /api/health can report the problem
        print(f"Campus-Pulse: could not build the campus from the CSVs: {exc!r}")
    yield


app = FastAPI(
    title="Campus-Pulse API",
    description="Student success, risk, segmentation and intervention analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------- #
# request bodies
# --------------------------------------------------------------------------- #
class InterventionCreate(BaseModel):
    studentId: str
    label: str | None = Field(default=None, description="Defaults to the student's suggested action")
    domain: Literal["academic", "placement"] | None = None
    owner: str | None = Field(default=None, description="Defaults to the student's mentor")
    status: Literal["suggested", "assigned", "in-progress", "completed"] = "assigned"

class InterventionStatusUpdate(BaseModel):
    status: Literal["suggested", "assigned", "in-progress", "completed"]

class PredictRequest(BaseModel):
    """Features of the saved placement model. Anything left out is treated as 0 by the model code."""
    cgpa: float = Field(ge=0, le=10)
    backlogs: int = Field(default=0, ge=0)
    attendance_pct: float = Field(ge=0, le=100)
    assignment_completion_pct: float = Field(default=0, ge=0, le=100)
    quiz_avg: float = Field(default=0, ge=0, le=100)
    technical_skill_score: float = Field(ge=0, le=100)
    communication_score: float = Field(default=0, ge=0, le=100)

# --------------------------------------------------------------------------- #
# routes
# --------------------------------------------------------------------------- #
@app.get("/")
def root():
    return {"message": "Welcome to Campus-Pulse API", "docs": "/docs", "health": "/api/health"}

@app.get("/api/health")
def health():
    try:
        students = len(campus_service.get_campus().students)
    except Exception as exc:
        return JSONResponse(status_code=503, content={"status": "error", "detail": repr(exc)})
    return {"status": "ok", "students": students}

@app.get("/api/overview")
def overview():
    return campus_service.get_overview()

@app.get("/api/students")
def students():
    return campus_service.get_students()

@app.get("/api/students/{student_id}")
def student(student_id: str):
    profile = campus_service.get_student(student_id.upper())
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return profile

@app.get("/api/risks")
def risks():
    return campus_service.get_risks()

@app.get("/api/segments")
def segments():
    return campus_service.get_segments()

@app.get("/api/alerts")
def alerts():
    return campus_service.get_alerts()

@app.get("/api/interventions")
def interventions():
    return campus_service.get_interventions()

@app.post("/api/interventions", status_code=201)
def create_intervention(body: InterventionCreate):
    item = campus_service.create_intervention(body.studentId, body.label, body.domain, body.owner, body.status)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Student {body.studentId} not found")
    return item

@app.patch("/api/interventions/{intervention_id}")
def update_intervention(intervention_id: str, body: InterventionStatusUpdate):
    # Suggested cards (SUG-xxx) are not stored yet: moving one creates the intervention.
    if intervention_id.startswith("SUG-"):
        card = next((i for i in campus_service.get_interventions()["interventions"] if i["interventionId"] == intervention_id), None)
        if card is None:
            raise HTTPException(status_code=404, detail=f"Intervention {intervention_id} not found")
        item = campus_service.create_intervention(card["studentId"], card["label"], card["domain"], card["owner"], body.status)
        return {"interventionId": item["interventionId"], "status": item["status"]}
    if not campus_service.update_intervention_status(intervention_id, body.status):
        raise HTTPException(status_code=404, detail=f"Intervention {intervention_id} not found")
    return {"interventionId": intervention_id, "status": body.status}

@app.get("/api/pipeline")
def pipeline():
    return campus_service.get_pipeline()

@app.post("/api/predict")
def predict(body: PredictRequest):
    from prediction import predict_placement  # imported lazily: loads the joblib model

    try:
        result = predict_placement(body.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Prediction failed: {exc}")
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

@app.post("/api/refresh")
def refresh():
    """Re-read the CSVs (e.g. after replacing a file in ../data) and rebuild every payload."""
    campus_service.refresh()
    return {"status": "ok", "students": len(campus_service.get_campus().students)}

# --------------------------------------------------------------------------- #
# `python main.py`: run the API, optionally together with the Next.js frontend
# --------------------------------------------------------------------------- #
def _start_frontend(api_url: str) -> subprocess.Popen | None:
    npm = shutil.which("npm")
    if npm is None:
        print("npm was not found. Install Node.js 20.9+ to run the frontend; starting the API only.")
        return None
    if not (FRONTEND_DIR / "package.json").exists():
        print(f"No frontend found at {FRONTEND_DIR}; starting the API only.")
        return None

    env = {**os.environ, "NEXT_PUBLIC_API_URL": api_url}
    if not (FRONTEND_DIR / "node_modules").exists():
        print("Installing frontend dependencies (first run only)...")
        subprocess.run([npm, "install"], cwd=FRONTEND_DIR, env=env, check=True)

    mode = os.getenv("FRONTEND_MODE", "dev")  # "dev" or "start" (needs `npm run build` first)
    proc = subprocess.Popen([npm, "run", mode], cwd=FRONTEND_DIR, env=env)
    atexit.register(lambda: proc.poll() is None and proc.terminate())
    print("Frontend: http://127.0.0.1:3000  (sign in with any details, it is a demo login)")
    return proc

def _cli() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(description="Run the Campus-Pulse API (and optionally the frontend).")
    parser.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    parser.add_argument("--reload", action="store_true", help="auto-reload the API on code changes")
    parser.add_argument("--frontend", action="store_true", help="also start the Next.js frontend")
    args = parser.parse_args()

    if args.frontend:
        public_host = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
        _start_frontend(f"http://{public_host}:{args.port}")

    uvicorn.run("main:app", host=args.host, port=args.port, reload=args.reload, app_dir=str(BACKEND_DIR))

if __name__ == "__main__":
    _cli()
