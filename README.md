# 🎓 CampusPulse

**Student success analytics for the ByteXL HacXLerate 2026 hackathon** · Team Cognitive Creators (XL0678)

> *Turning scattered campus data into clear, explainable mentor actions before results day.*

**Live demo:** https://frontend-production-852be.up.railway.app

CampusPulse joins seven student data sources into one record per student, gives every student a 0–100 Student Success Score, flags academic and placement risk separately with the reasons behind each flag, groups students into segments for group interventions, and lets mentors assign and track follow-ups.

## ✨ Key Features

* **Student Success Score (0–100):** Seven data areas weighted into one score per student, with a breakdown of which area costs the most points.
* **Two separate risk tracks:** **Academic risk** and **placement risk** are never merged, so high-CGPA students with weak coding or aptitude scores are still flagged.
* **Explainable flags:** Every flag shows each factor's share (e.g. "41% attendance, 29% CGPA, 23% backlogs, 7% LMS").
* **Placement prediction:** A Random Forest model adds each student's placement probability.
* **Segments:** K-means groups students into 6 segments for group interventions (bootcamps, mentor calls).
* **Follow-up tracking:** Mentors assign actions from a profile and track them from suggested to completed.

## 🧰 Tech Stack

| Layer | Tools |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Backend | FastAPI, pandas, scikit-learn |
| Hosting | Railway (frontend and API as separate services) |

## 🚀 Getting Started

### Prerequisites

* **Python** 3.12
* **Node.js** 20.9+

### Install

```bash
pip install -r backend/requirements.txt
cd frontend && npm ci && cd ..
```

### Run

**Both together:**

```bash
python backend/main.py --frontend
```

**Separately (for development):**

```bash
python backend/main.py            # API on http://127.0.0.1:8000
npm --prefix frontend run dev     # Frontend on http://127.0.0.1:3000
```

* 🖥️ **Dashboard:** http://127.0.0.1:3000 (sign in to the demo)
* ⚙️ **API docs:** http://127.0.0.1:8000/docs

## 🏗️ How It Fits Together

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

## 📁 Repository Structure

```text
├── data/                       # CSV exports: Academic, Attendance, LMS, Engagement, Placement, Skills, Feedback
├── backend/
│   ├── main.py                 # FastAPI app and routes
│   ├── campus_service.py       # Builds every API payload
│   ├── data_loader.py          # Loads, validates and joins the CSVs
│   ├── scoring.py              # 0–100 Success Score
│   ├── risk_engine.py          # Academic and placement risk with factor shares
│   ├── segmentation.py         # K-means segments
│   ├── prediction.py           # Placement model inference
│   ├── placement_model.joblib  # Trained Random Forest
│   ├── interventions.py        # Saved follow-ups and handled alerts
│   └── test_regressions.py     # Backend tests
├── docs/RAILWAY_DEPLOYMENT.md  # Deployment settings and checks
└── frontend/                   # Next.js app (see frontend/README.md)
```

## 📊 What Is Real and What Is Simulated

* **Real (from the CSVs):** every score, CGPA, attendance, LMS, placement, skills, engagement and feedback value, the Success Score, risk levels, placement-model probabilities and segments.
* **Simulated (the data is anonymised and a single snapshot):** student names, emails, departments and mentors; the split of attendance by subject (it always adds up to the real total); the 12-week history behind the trend charts; and the starter set of past interventions. Every page footnote says this.

## ☁️ Data, Persistence and Deployment

* **Rescoring:** after replacing a CSV in `data/`, call `POST /api/refresh`.
* **Saved actions:** interventions, handled alerts and planned group sessions are saved to `backend/interventions_store.json` (git-ignored).
* **Railway:** `CAMPUS_STORE_PATH` points to `/campus-store/interventions_store.json` on an attached volume, so saved actions survive deployments. Both services deploy from GitHub `main`; see [deployment settings and checks](docs/RAILWAY_DEPLOYMENT.md).

## 🧪 Testing

```bash
python -m unittest discover -s backend -p 'test_*.py' -v   # backend
npm --prefix frontend run lint                             # frontend lint
npm --prefix frontend run build                            # frontend build
```
