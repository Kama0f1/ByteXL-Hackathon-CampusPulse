"""
Campus-Pulse - FastAPI entry point with Supabase Integration.

Serves the JSON API the Next.js frontend reads, and can start the frontend too.
Expects a .env file in the root directory containing:
    SUPABASE_URL=your_project_url
    SUPABASE_KEY=your_anon_or_service_key
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
from supabase import create_client, Client

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

# --------------------------------------------------------------------------- #
# Supabase Initialization
# --------------------------------------------------------------------------- #
load_dotenv()

SUPABASE_URL = "https://yyrifmorokitllxjttj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cmlmbW9yb3hraXRsbHhqdHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjE4MTcsImV4cCI6MjEwNzE5NzgxN30.GGMzG7kWAJ5NImhEMqto50GwuKVPpTO2zlN02PjP94o"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_KEY environment variables are missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --------------------------------------------------------------------------- #
# app
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(_: FastAPI):
    # Verify database connection on startup instead of loading CSVs
    try:
        # A lightweight query to verify the connection is active
        supabase.table("students").select("id").limit(1).execute()
        print("Campus-Pulse: Supabase connected successfully. ML Models ready.")
    except Exception as exc: 
        print(f"Campus-Pulse: Database connection failed on startup: {exc!r}")
    yield


app = FastAPI(
    title="Campus-Pulse API",
    description="Student success, risk, segmentation and intervention analytics powered by Supabase.",
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
    return {"status": "ok", "database": "supabase"}

@app.get("/api/overview")
def overview():
    response = supabase.table("overview").select("*").single().execute()
    return response.data

@app.get("/api/students")
def students():
    response = supabase.table("students").select("*").execute()
    return response.data

@app.get("/api/students/{student_id}")
def student(student_id: str):
    response = supabase.table("students").select("*").eq("id", student_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return response.data[0]

@app.get("/api/risks")
def risks():
    response = supabase.table("risks").select("*").execute()
    return response.data

@app.get("/api/segments")
def segments():
    response = supabase.table("segments").select("*").execute()
    return response.data

@app.get("/api/interventions")
def interventions():
    response = supabase.table("interventions").select("*").execute()
    return response.data

@app.post("/api/interventions", status_code=201)
def create_intervention(body: InterventionCreate):
    new_intervention = {
        "student_id": body.studentId,
        "label": body.label,
        "domain": body.domain,
        "owner": body.owner,
        "status": body.status
    }
    response = supabase.table("interventions").insert(new_intervention).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create intervention")
    return response.data[0]

@app.patch("/api/interventions/{intervention_id}")
def update_intervention(intervention_id: str, body: InterventionStatusUpdate):
    response = supabase.table("interventions").update({"status": body.status}).eq("id", intervention_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Intervention {intervention_id} not found")
    return {"interventionId": intervention_id, "status": body.status}

@app.get("/api/pipeline")
def pipeline():
    response = supabase.table("pipeline").select("*").execute()
    return response.data

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
    """Returns a status indicating data is pulled live from the database."""
    return {"status": "Database connection is live. No CSV refresh needed."}

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
