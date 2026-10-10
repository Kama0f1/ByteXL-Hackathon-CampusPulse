# CampusPulse

Student success analytics for the ByteXL hackathon brief "Smart Campus Analytics". CampusPulse joins seven student data sources into one record per student, gives every student a 0-100 Student Success Score, flags academic and placement risk separately with the reasons behind each flag, groups students into segments for group interventions, and lets mentors assign and track follow-ups.

## Run it

Needs Python 3.12 and Node.js 20.9+.

```bash
pip install -r backend/requirements.txt
cd frontend && npm ci && cd ..
python backend/main.py --frontend
```

Open http://127.0.0.1:3000 and sign in to the demo. The API runs on http://127.0.0.1:8000 (interactive docs at `/docs`). To run them separately: `python backend/main.py` and `npm --prefix frontend run dev`.

## How it fits together

```
data/*.csv (7 sources, 1,000 students)
  -> backend/data_loader.py      join on student_id, fill missing values
  -> backend/campus_service.py   success score, risk indices and reasons (risk_engine.py),
                                 placement model, segments, insights, alerts, interventions
  -> backend/main.py (FastAPI)   /api/overview, students, risks, segments, alerts,
                                 interventions, pipeline, predict, refresh
  -> frontend (Next.js)          dashboard, alerts, students, risks, segments,
                                 interventions, data sources
```

| Folder | Contents |
|---|---|
| `data/` | The seven CSV exports: Academic, Attendance, LMS, Engagement, Placement, Skills, Feedback |
| `backend/` | FastAPI service and analytics (`scoring.py`, `risk_engine.py`, `segmentation.py`, `prediction.py` + `placement_model.joblib`) |
| `frontend/` | Next.js app; see `frontend/README.md` |

## What is real and what is simulated

Real, from the CSVs: every score, CGPA, attendance, LMS, placement, skills, engagement and feedback value, the Success Score, risk levels, placement-model probabilities and segments.

Simulated, because the provided data is anonymised and is a single snapshot: student names, emails, departments and mentors; the split of attendance by subject (it always adds up to the real total); the 12-week history behind the trend charts; and the starter set of past interventions. Every page footnote says this.

Interventions, handled alerts and planned group sessions are saved to `backend/interventions_store.json` (git-ignored). After replacing a CSV in `data/`, call `POST /api/refresh` to rescore.

On Railway, `CAMPUS_STORE_PATH` points to `/campus-store/interventions_store.json` on an attached volume, preserving saved actions across deployments. Both services deploy from GitHub `main`; see [deployment settings and checks](docs/RAILWAY_DEPLOYMENT.md).

Run backend regression checks with `python -m unittest discover -s backend -p 'test_*.py' -v`, and frontend checks with `npm --prefix frontend run lint` and `npm --prefix frontend run build`.
