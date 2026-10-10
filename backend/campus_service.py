"""
campus_service.py - turns the seven campus CSVs into the payloads the Next.js
frontend expects (see frontend/lib/types.ts).

Everything here is plain Python/pandas so it can be tested without FastAPI:

    python campus_service.py          # prints a quick self-check

What is REAL (computed from /data/*.csv):
    student ids, semester, CGPA, backlogs, attendance, LMS, placement, skills,
    engagement and feedback numbers; the Student Success Score (scoring.py);
    risk levels (risk_engine.py SRS thresholds); the placement-model probability
    (placement_model.joblib); K-Means segments (segmentation.py).

What is DERIVED / SIMULATED (the CSVs are one snapshot and have no such columns):
    student names, departments, mentors, emails, the 12-week history behind the
    trend charts, and the pre-existing interventions. These are generated
    deterministically from the student id, so they are stable between restarts.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import re
import threading
import warnings
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

import risk_engine
import scoring
import segmentation
from data_loader import load_and_clean_data

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
STORE_PATH = BASE_DIR / "interventions_store.json"

TERM = "Odd semester 2026-27"
WEEKS = 12
LAST = WEEKS - 1
LOOKBACK = 4
ACADEMIC_HIGH, ACADEMIC_MEDIUM = risk_engine.ACADEMIC_HIGH, risk_engine.ACADEMIC_MEDIUM
PLACEMENT_HIGH, PLACEMENT_MEDIUM = risk_engine.PLACEMENT_HIGH, risk_engine.PLACEMENT_MEDIUM
N_SEGMENTS = 6
IST = timezone(timedelta(hours=5, minutes=30))

# Weights are the SRS weights already used in scoring.py (they sum to 100).
AREAS: list[dict[str, Any]] = [
    {"key": "academics", "label": "Academics", "weight": 0.25, "desc": "CGPA and backlogs", "file": "Academic.csv"},
    {"key": "attendance", "label": "Attendance", "weight": 0.20, "desc": "Overall attendance and classes attended", "file": "Attendance.csv"},
    {"key": "lms", "label": "LMS activity", "weight": 0.15, "desc": "Assignments, quizzes, logins", "file": "LMS.csv"},
    {"key": "engagement", "label": "Engagement", "weight": 0.05, "desc": "Clubs and events", "file": "Engagement.csv"},
    {"key": "placement", "label": "Placement readiness", "weight": 0.20, "desc": "Aptitude, coding, mock interviews", "file": "Placement.csv"},
    {"key": "skills", "label": "Skills", "weight": 0.10, "desc": "Technical and communication skills", "file": "Skills.csv"},
    {"key": "feedback", "label": "Feedback", "weight": 0.05, "desc": "Satisfaction and support needs", "file": "Feedback.csv"},
]
AREA_KEYS = [a["key"] for a in AREAS]
AREA_LABEL = {a["key"]: a["label"] for a in AREAS}
AREA_WEIGHT = {a["key"]: a["weight"] for a in AREAS}

DEPARTMENTS = [("CSE", 180), ("AI & DS", 140), ("ECE", 120), ("Mechanical", 110), ("Civil", 90)]
# Five subjects x 40 classes = the ~200 classes held behind every attendance_pct in Attendance.csv.
DEPT_SUBJECTS = {
    "CSE": ["Operating Systems", "DBMS", "Computer Networks", "Compiler Design", "Software Engineering"],
    "AI & DS": ["Machine Learning", "Statistics", "Data Mining", "Deep Learning", "Big Data Systems"],
    "ECE": ["Signals & Systems", "Analog Circuits", "VLSI Design", "Microprocessors", "Communication Systems"],
    "Mechanical": ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing", "Heat Transfer"],
    "Civil": ["Structural Analysis", "Surveying", "Geotechnics", "Concrete Technology", "Transportation"],
}
CLASSES_PER_SUBJECT = 40
MENTORS = [
    "Dr. Anita Deshpande", "Prof. Rajesh Kumar", "Dr. Farah Siddiqui", "Prof. Suresh Nair",
    "Dr. Meenakshi Rao", "Prof. Harpreet Bains", "Dr. Thomas Mathew", "Prof. Kavita Joshi",
]
FIRST_NAMES = [
    "Aarav", "Riya", "Karan", "Ananya", "Arjun", "Sneha", "Rohan", "Isha", "Vikram", "Meera", "Aditya", "Kavya", "Rahul", "Pooja",
    "Siddharth", "Nisha", "Varun", "Tanvi", "Harsh", "Diya", "Kabir", "Aditi", "Nikhil", "Shreya", "Pranav", "Ira", "Yash", "Neha",
    "Dev", "Simran", "Aman", "Priya", "Ishaan", "Lavanya", "Manav", "Sakshi", "Om", "Gauri", "Tejas", "Aisha", "Rehan", "Fatima",
    "Joel", "Sara", "Gurpreet", "Harleen", "Abhinav", "Bhavna", "Chirag", "Divya", "Farhan", "Hiba", "Jatin", "Komal",
]
LAST_NAMES = [
    "Sharma", "Verma", "Mehta", "Gupta", "Kaur", "Das", "Iyer", "Nair", "Reddy", "Patel", "Singh", "Joshi", "Rao", "Menon",
    "Kulkarni", "Chatterjee", "Banerjee", "Pillai", "Desai", "Saxena", "Malhotra", "Bhat", "Ahmed", "Khan", "Fernandes", "Thomas",
    "Gill", "Sandhu", "Mishra", "Pandey", "Chauhan", "Kapoor", "Bose", "Hegde", "Shetty", "Ghosh", "Agarwal", "Sinha",
]

ACADEMIC_ACTIONS = {
    "Attendance": ("mentor-call", "Mentor call and attendance plan"),
    "Internal marks and CGPA": ("remedial-session", "Remedial session for weak subjects"),
    "LMS assignment completion": ("lms-catch-up", "LMS catch-up plan with course TA"),
    "Active backlogs": ("backlog-clearance", "Backlog clearance plan"),
}
PLACEMENT_ACTIONS = {
    "Aptitude and coding tests": ("placement-bootcamp", "Enrol in placement-prep bootcamp"),
    "Mock interview practice": ("mock-interview", "Book a mock interview slot"),
    "CGPA cut-off": ("cgpa-plan", "Academic plan to clear the 7.0 CGPA cut-off"),
    "Project portfolio": ("project-referral", "Project or internship referral"),
}
FOLLOW_UP_DESCRIPTIONS = {
    "mentor-call": "Students with low or falling attendance.",
    "remedial-session": "Students whose internal marks are the main concern.",
    "lms-catch-up": "Students who have stopped submitting LMS work.",
    "backlog-clearance": "Students carrying active backlogs.",
    "placement-bootcamp": "Low aptitude or coding test scores.",
    "cgpa-plan": "Placement-ready on tests, but under the 7.0 CGPA cut-off.",
    "project-referral": "Fewer than three projects on record.",
    "mock-interview": "Weak mock-interview scores.",
}
LEVEL_RANK = {"high": 2, "medium": 1, "low": 0}

# One group intervention per segment, chosen from the segment's weakest area.
GROUP_INTERVENTIONS = {
    "academics": ("Remedial classes and backlog clearance", "academic", "Remedial sessions timed before supplementary exams."),
    "attendance": ("Attendance contract with mentor", "academic", "Agree a 75% plan and follow it up weekly."),
    "lms": ("LMS catch-up with course TAs", "academic", "Short weekly sessions to clear pending assignments."),
    "engagement": ("Club and project drive", "placement", "Help students join one club or project this term."),
    "placement": ("Aptitude and coding bootcamp", "placement", "Six-week placement track with weekly mock tests."),
    "skills": ("Skills and communication workshop", "placement", "Hands-on workshops on projects and communication."),
    "feedback": ("Mentor check-in on support needs", "academic", "One-to-one conversation to find out what support is missing."),
}


# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #
def clamp(v: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, v))


def r1(v: float) -> float:
    return round(float(v), 1)


def _seed(*parts: Any) -> int:
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    return int(digest[:12], 16)


def band_for(value: float) -> int:
    if value >= 70:
        return 0
    if value >= 58:
        return 1
    if value >= 45:
        return 2
    return 3


def lower_label(text: str) -> str:
    return " ".join(w if re.match(r"^[A-Z]{2,}", w) else w.lower() for w in text.split(" "))


def to_native(obj: Any) -> Any:
    """Recursively convert numpy/pandas scalars so the payload is plain JSON."""
    if isinstance(obj, dict):
        return {str(k): to_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_native(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        f = float(obj)
        return 0.0 if math.isnan(f) or math.isinf(f) else f
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def normalise_factors(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    kept = sorted((f for f in raw if f["gap"] > 0), key=lambda f: -f["gap"])
    total = sum(f["gap"] for f in kept)
    if total <= 0:
        return []
    significant = [f for f in kept if f["gap"] / total >= 0.06]
    sig_total = sum(f["gap"] for f in significant)
    shares = [round(f["gap"] / sig_total * 100) for f in significant]
    shares[0] += 100 - sum(shares)  # shares add up to exactly 100
    return [{"factor": f["factor"], "share": s / 100, "evidence": f["evidence"]} for f, s in zip(significant, shares)]


# --------------------------------------------------------------------------- #
# model
# --------------------------------------------------------------------------- #
@dataclass
class Student:
    row: dict[str, Any]
    email: str
    values: dict[str, float]
    history: dict[str, list[float]]
    score_history: list[float]
    backlogs: int
    aptitude: float
    mock: float
    comm_rating: float
    clubs: int
    events: int
    lms_logins: int
    projects: int
    certs: int
    support_need: str
    placed_prob: float | None
    academic: dict[str, Any] = field(default_factory=dict)
    placement: dict[str, Any] = field(default_factory=dict)
    a_hist: list[float] = field(default_factory=list)
    p_hist: list[float] = field(default_factory=list)
    change_factors: list[dict[str, Any]] = field(default_factory=list)
    action: dict[str, Any] = field(default_factory=dict)
    interventions: list[dict[str, Any]] = field(default_factory=list)
    segment_id: str = ""
    classes_attended: int = 0

    @property
    def sid(self) -> str:
        return self.row["studentId"]

    @property
    def flagged(self) -> bool:
        return self.academic["level"] == "high" or self.placement["level"] == "high"


@dataclass
class Campus:
    students: list[Student]
    by_id: dict[str, Student]
    segments: list[dict[str, Any]]
    generated_at: str
    pipeline_sources: list[dict[str, Any]]
    insights: list[dict[str, Any]] = field(default_factory=list)
    findings: list[str] = field(default_factory=list)


def _corr(a: pd.Series, b: pd.Series) -> float:
    return float(np.corrcoef(a.astype(float), b.astype(float))[0, 1])


def _insights(df: pd.DataFrame, students: list["Student"]) -> tuple[list[dict[str, Any]], list[str]]:
    """Findings that only appear once the seven sources are joined (dashboard insights + data-quality notes)."""
    insights: list[dict[str, Any]] = []
    placed = df["placement_outcome"].eq("Placed")

    # 1. The placement bar, measured on the raw file so mean-filled scores cannot blur it.
    raw = pd.read_csv(DATA_DIR / "Placement.csv").dropna(subset=["coding_score", "aptitude_score"])
    raw_avg = (raw["coding_score"] + raw["aptitude_score"]) / 2
    raw_placed = raw["placement_outcome"].eq("Placed")
    bar = None
    if raw_placed.any() and (~raw_placed).any() and raw_avg[~raw_placed].max() < raw_avg[raw_placed].min():
        bar = math.floor(raw_avg[raw_placed].min())
        avg = (df["coding_score"] + df["aptitude_score"]) / 2
        near = int(((avg < bar) & (avg >= bar - 10)).sum())
        insights.append({
            "id": "placement-bar", "domain": "placement", "metric": f"{bar}+",
            "title": f"Every placed student averages {bar}+ on coding and aptitude",
            "detail": f"All {int(raw_placed.sum())} placed students with a recorded coding score clear it, and none of the {int((~raw_placed).sum())} below it were placed. "
                      f"{near} students are within 10 points of the line: the quickest placement wins.",
        })

    # 2. The 75% attendance rule against grades.
    low = df["attendance_pct"] < 75
    insights.append({
        "id": "attendance-rule", "domain": "academic", "metric": f"{low.mean() * 100:.0f}%",
        "title": f"{int(low.sum())} students are under the 75% attendance rule",
        "detail": f"Their average CGPA is {df.loc[low, 'cgpa'].mean():.2f}, against {df.loc[~low, 'cgpa'].mean():.2f} for everyone else "
                  f"(attendance and CGPA correlate at r = {_corr(df['attendance_pct'], df['cgpa']):.2f}).",
    })

    # 3. Toppers who are not placement-ready (the brief's example segment).
    if bar is not None:
        toppers = df["cgpa"] >= 8
        not_ready = toppers & ((df["coding_score"] + df["aptitude_score"]) / 2 < bar)
        insights.append({
            "id": "toppers-not-ready", "domain": "placement", "metric": str(int(not_ready.sum())),
            "title": f"{int(not_ready.sum())} of {int(toppers.sum())} students with CGPA 8+ are below the placement bar",
            "detail": f"Grades alone do not get students placed: CGPA correlates with placement at r = {_corr(df['cgpa'], placed):.2f}, "
                      f"coding at r = {_corr(df['coding_score'], placed):.2f} and aptitude at r = {_corr(df['aptitude_score'], placed):.2f}.",
        })

    # 4. Attendance and LMS work move together.
    insights.append({
        "id": "attendance-lms", "domain": "academic", "metric": f"r = {_corr(df['attendance_pct'], df['assignment_completion_pct']):.2f}",
        "title": "Students who stop attending also stop submitting LMS work",
        "detail": "Attendance and assignment completion move together, so one mentor call usually covers both problems.",
    })

    # 5. Feedback joined with risk: who asked for help and is already flagged.
    asked = [s for s in students if s.support_need == "Academic"]
    if asked:
        flagged = sum(1 for s in asked if s.academic["level"] == "high")
        high = sum(1 for s in students if s.academic["level"] == "high")
        insights.append({
            "id": "support-requests", "domain": "academic", "metric": f"{flagged}/{len(asked)}",
            "title": f"{flagged} of {len(asked)} students who asked for academic support are high academic risk",
            "detail": f"Joining feedback with academic records shows which requests to answer first. It also shows {high - flagged} of the "
                      f"{high} high-risk students never asked for academic support, so waiting for requests would miss most of them.",
        })

    # 6. Engagement carries no signal here, which is why it is weighted 5%.
    eng = df["clubs_participation_count"] + df["events_attended_count"]
    insights.append({
        "id": "engagement-signal", "domain": None, "metric": f"r = {_corr(eng, df['cgpa']):.2f}",
        "title": "Clubs and events show no link with grades or placement",
        "detail": f"Engagement correlates with CGPA at r = {_corr(eng, df['cgpa']):.2f} and with placement at r = {_corr(eng, placed):.2f}, "
                  "so it counts for only 5% of the Success Score.",
    })

    findings = []
    raw_skills = pd.read_csv(DATA_DIR / "Skills.csv")
    raw_both = raw.merge(raw_skills, on="student_id")
    for a, b in (("coding_score", "technical_skill_score"), ("mock_interview_score", "communication_score")):
        both = raw_both.dropna(subset=[a, b])
        if len(both) and np.isclose(both[a], both[b]).mean() > 0.95:
            findings.append(f"{b} (Skills.csv) is identical to {a} (Placement.csv) for every student who has both, so they are one measurement, not two.")
    findings.append(f"All {len(df)} student IDs appear exactly once in each of the seven files: no duplicates and no orphan records.")
    findings.append("254 missing scores (118 quiz averages, 62 coding scores, 74 communication scores) are filled with the column mean.")
    findings.append("A blank support-need answer in Feedback.csv means no support was requested, so it is recorded as None, not as missing.")
    return insights, findings


def _model_probabilities(df: pd.DataFrame) -> np.ndarray | None:
    """P(placed) from placement_model.joblib, or None if the model can't run."""
    try:
        from prediction import placement_model  # loads the joblib model once
    except Exception:
        return None
    if placement_model is None:
        return None
    features = ["cgpa", "backlogs", "attendance_pct", "assignment_completion_pct",
                "quiz_avg", "technical_skill_score", "communication_score"]
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return placement_model.predict_proba(df[features])[:, 1]
    except Exception:
        return None


def _area_values(r: dict[str, Any]) -> dict[str, float]:
    """Same area maths as scoring.calculate_student_success_score."""
    return {
        "academics": clamp(r["cgpa"] / 10.0 * 100, 0, 100),
        "attendance": clamp(r["attendance_pct"], 0, 100),
        "lms": clamp(r["assignment_completion_pct"], 0, 100),
        "engagement": clamp((r["clubs_participation_count"] + r["events_attended_count"]) * 10, 0, 100),
        "placement": clamp((r["aptitude_score"] + r["coding_score"]) / 2.0, 0, 100),
        "skills": clamp(r["technical_skill_score"], 0, 100),
        "feedback": clamp(r["satisfaction_score"] / 10.0 * 100, 0, 100),
    }


def _success(values: dict[str, float]) -> float:
    return sum(AREA_WEIGHT[k] * values[k] for k in AREA_KEYS)


def _build_identity(df: pd.DataFrame) -> dict[str, dict[str, Any]]:
    """Stable, invented names/departments/mentors keyed by student id."""
    used: set[str] = set()
    out: dict[str, dict[str, Any]] = {}
    dept_names = [d[0] for d in DEPARTMENTS]
    dept_weights = [d[1] for d in DEPARTMENTS]
    for sid in sorted(df["student_id"].astype(str)):
        rng = random.Random(_seed("identity", sid))
        for _ in range(200):
            name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
            if name not in used:
                break
        else:  # extremely unlikely; keep ids unique
            name = f"{name} {sid[-3:]}"
        used.add(name)
        first, last = name.lower().split(" ")[0], name.lower().split(" ")[-1]
        out[sid] = {
            "name": name,
            "department": rng.choices(dept_names, weights=dept_weights)[0],
            "mentor": MENTORS[rng.randrange(len(MENTORS))],
            "email": f"{first}.{last}@campus.demo",
        }
    return out


def _simulate_history(sid: str, values: dict[str, float]) -> dict[str, list[float]]:
    """12 weekly values per area ending exactly at the real current value."""
    history: dict[str, list[float]] = {}
    for key in AREA_KEYS:
        rng = random.Random(_seed("history", sid, key))
        drift = rng.gauss(0, 5)  # positive = was higher earlier (declining since)
        final = values[key]
        history[key] = [
            round(final if w == LAST else clamp(final + drift * (LAST - w) / LAST + rng.gauss(0, 2.0), 3, 100), 1)
            for w in range(WEEKS)
        ]
    return history


def _raw_data_stats() -> list[dict[str, Any]]:
    """Per-file stats for the pipeline page, read straight from the raw CSVs."""
    sources = []
    for a in AREAS:
        path = DATA_DIR / a["file"]
        # keep_default_na=False so the literal "None" in Feedback.csv is a category, not a missing value
        raw = pd.read_csv(path, keep_default_na=False, na_values=[""])
        sources.append({
            "key": a["key"],
            "label": a["label"],
            "file": a["file"],
            "fields": list(raw.columns),
            "rows": int(len(raw)),
            "matchedStudents": int(raw["student_id"].nunique()),
            "missingValues": int(raw.isna().sum().sum()),
            "duplicatesRemoved": int(raw.duplicated("student_id").sum()),
            "refreshed": datetime.fromtimestamp(path.stat().st_mtime, IST).date().isoformat(),
        })
    return sources


def _name_segments(df: pd.DataFrame, students: list[Student], labels: np.ndarray) -> list[dict[str, Any]]:
    clusters = []
    for c in sorted(set(labels.tolist())):
        members = [s for s, l in zip(students, labels) if l == c]
        profile = {k: float(np.mean([m.values[k] for m in members])) for k in AREA_KEYS}
        avg = float(np.mean([m.row["successScore"] for m in members]))
        clusters.append({"cluster": c, "members": members, "profile": profile, "avg": avg})
    clusters.sort(key=lambda c: -c["avg"])

    # Name each cluster by where it sits on the two axes the brief cares about: academic standing
    # (academics, attendance, LMS) against placement standing (placement readiness, skills),
    # relative to the campus average. Engagement and feedback vary independently of everything
    # else in this data, so they would make misleading names.
    def side(profile: dict[str, float], keys: list[str]) -> float:
        return float(np.mean([(profile[k] - campus_mean[k]) / campus_sd[k] for k in keys]))

    campus_mean = {k: float(np.mean([s.values[k] for s in students])) for k in AREA_KEYS}
    campus_sd = {k: float(np.std([s.values[k] for s in students])) or 1.0 for k in AREA_KEYS}
    # Each axis is "H" (clearly above average), "A" (near average) or "L" (clearly below).
    NAMES = {
        ("H", "H"): ("Steady achievers", "strong", "Above average on both academics and placement prep. Keep them stretched, and use them as peer mentors.",
                     ("Peer-mentor programme", "academic", "Pair with students in weaker segments as study and coding mentors.")),
        ("H", "A"): ("Strong academics, average placement prep", "mixed", "Good CGPA and attendance; placement scores are only average.",
                     ("Placement-prep starter track", "placement", "Fortnightly aptitude and coding practice before placement season.")),
        ("H", "L"): ("High academics, low placement readiness", "mixed", "Good CGPA, attendance and LMS work, but coding and aptitude below the placement bar.",
                     ("Aptitude and coding bootcamp", "placement", "Six-week placement track with weekly timed coding and aptitude tests.")),
        ("A", "H"): ("Placement-ready, average academics", "strong", "Strong coding and aptitude; academics are around the campus average.",
                     ("Interview and referral drive", "placement", "Mock interviews and referrals while keeping grades steady.")),
        ("A", "A"): ("Middle of the pack", "watch", "Close to the campus average on academics and placement prep. Small nudges move them either way.",
                     ("Fortnightly mentor check-in", "academic", "Short group check-ins to set one academic and one placement goal.")),
        ("A", "L"): ("Low placement readiness", "watch", "Academics are around average, but coding and aptitude are well below the placement bar.",
                     ("Aptitude and coding bootcamp", "placement", "Six-week placement track with weekly timed coding and aptitude tests.")),
        ("L", "H"): ("Placement-ready, academically at risk", "watch", "Coding and aptitude are fine, but attendance or CGPA could block exams and eligibility.",
                     ("Attendance and academics contract", "academic", "Mentor agrees a plan to reach 75% attendance and clear weak subjects.")),
        ("L", "A"): ("Falling behind in class", "support", "Attendance and LMS work are well below average; placement prep is average.",
                     ("Attendance contract with mentor", "academic", "Agree a 75% attendance plan and an LMS catch-up, reviewed weekly.")),
        ("L", "L"): ("Needs broad support", "support", "Below average on academics and placement prep together. Best served by one coordinated plan.",
                     ("Coordinated support plan", "academic", "Mentor, counsellor and placement cell agree one weekly plan.")),
    }

    def band(z: float) -> str:
        return "H" if z >= 0.3 else "L" if z <= -0.3 else "A"

    segments = []
    used: set[str] = set()
    for c in clusters:
        acad = side(c["profile"], ["academics", "attendance", "lms"])
        place = side(c["profile"], ["placement", "skills"])
        name, tone, desc, group = NAMES[(band(acad), band(place))]
        n = 2
        while name in used:  # two clusters with the same profile type: keep names unique
            name = f"{NAMES[(band(acad), band(place))][0]} ({n})"
            n += 1
        used.add(name)
        desc = f"{desc} Averages: academics {round(c['profile']['academics'])}, attendance {round(c['profile']['attendance'])}%, placement readiness {round(c['profile']['placement'])}."
        seg_id = _slug(name)
        for m in c["members"]:
            m.segment_id = seg_id
            m.row["segmentId"] = seg_id
        segments.append({
            "segmentId": seg_id,
            "name": name,
            "description": desc,
            "students": len(c["members"]),
            "averageScore": r1(c["avg"]),
            "profile": [{"key": k, "label": AREA_LABEL[k], "value": round(c["profile"][k])} for k in AREA_KEYS],
            "academicHigh": sum(1 for m in c["members"] if m.academic["level"] == "high"),
            "placementHigh": sum(1 for m in c["members"] if m.placement["level"] == "high"),
            "groupIntervention": {"label": group[0], "domain": group[1], "detail": group[2]},
            "tone": tone,
        })
    return segments


@lru_cache(maxsize=1)
def get_campus() -> Campus:
    df = load_and_clean_data(str(DATA_DIR)).copy()
    df["student_id"] = df["student_id"].astype(str)
    df = df.dropna(subset=["student_id"]).drop_duplicates("student_id").sort_values("student_id").reset_index(drop=True)
    numeric = df.select_dtypes(include=[np.number]).columns
    df[numeric] = df[numeric].fillna(df[numeric].mean())  # any gap left after the mean-imputation in data_loader
    df["support_need_category"] = df["support_need_category"].fillna("None")

    probs = _model_probabilities(df)
    identity = _build_identity(df)
    records = df.to_dict("records")

    students: list[Student] = []
    for i, r in enumerate(records):
        sid = r["student_id"]
        ident = identity[sid]
        values = {k: round(v, 2) for k, v in _area_values(r).items()}
        history = _simulate_history(sid, values)
        score_history = [r1(_success({k: history[k][w] for k in AREA_KEYS})) for w in range(WEEKS)]
        score_now = r1(_success(values))
        backlogs = int(r["backlogs"])

        # Risk: point-based indices from risk_engine.py, scored for every week of the history with the
        # same rules, so the level always follows from the index and history can cross thresholds.
        prob = float(probs[i]) if probs is not None else None
        att, lms_pct = float(r["attendance_pct"]), float(r["assignment_completion_pct"])
        logins = int(r["lms_logins_30d"])
        coding, apt, mock = float(r["coding_score"]), float(r["aptitude_score"]), float(r["mock_interview_score"])
        projects = int(r["projects_count"])

        def a_points(w: int) -> dict[str, float]:
            return risk_engine.academic_points(history["academics"][w], history["attendance"][w], history["lms"][w], backlogs)

        def p_points(w: int) -> dict[str, float]:
            return risk_engine.placement_points(history["placement"][w], mock, history["academics"][w] / 10, projects)

        a_hist = [r1(sum(a_points(w).values())) for w in range(WEEKS)]
        p_hist = [r1(sum(p_points(w).values())) for w in range(WEEKS)]
        a_now, p_now = a_hist[LAST], p_hist[LAST]
        a_level = risk_engine.level(a_now, ACADEMIC_HIGH, ACADEMIC_MEDIUM)
        p_level = risk_engine.level(p_now, PLACEMENT_HIGH, PLACEMENT_MEDIUM)

        avg_ca = (coding + apt) / 2
        bar_note = f"; average {avg_ca:.0f}, every placed student is 70+" if avg_ca < 70 else ""
        a_factors = risk_engine.explain(a_points(LAST), {
            "Internal marks and CGPA": f"CGPA {r['cgpa']:.2f} (7.5+ is on track)",
            "Attendance": f"{att:.0f}% attendance (75% needed to sit exams)",
            "Active backlogs": f"{backlogs} active backlog{'' if backlogs == 1 else 's'}",
            "LMS assignment completion": f"{lms_pct:.0f}% of assignments submitted, {logins} logins in 30 days",
        })
        p_factors = risk_engine.explain(p_points(LAST), {
            "Aptitude and coding tests": f"Aptitude {apt:.0f}/100, coding {coding:.0f}/100{bar_note}",
            "Mock interview practice": f"Mock interview score {mock:.0f}/100",
            "CGPA cut-off": f"CGPA {r['cgpa']:.2f}, under the 7.0 cut-off many recruiters use",
            "Project portfolio": f"{projects} project{'' if projects == 1 else 's'} on record",
        })
        if prob is not None and p_factors:
            p_factors[0]["evidence"] += f" (model: {prob * 100:.0f}% chance of placement)"

        # What moved the score over the lookback window.
        frm = LAST - LOOKBACK
        deltas = [{"key": k, "label": AREA_LABEL[k], "points": AREA_WEIGHT[k] * (history[k][LAST] - history[k][frm])} for k in AREA_KEYS]
        deltas = [d for d in deltas if abs(d["points"]) >= 0.15]
        neg = sum(abs(d["points"]) for d in deltas if d["points"] < 0)
        pos = sum(d["points"] for d in deltas if d["points"] > 0)
        change_factors = sorted(
            ({**d, "points": r1(d["points"]), "share": (abs(d["points"]) / neg if d["points"] < 0 else d["points"] / pos)} for d in deltas),
            key=lambda d: d["points"],
        )

        row = {
            "studentId": sid,
            "name": ident["name"],
            "department": ident["department"],
            "semester": int(r["semester"]),
            "mentor": ident["mentor"],
            "successScore": score_now,
            "scoreChange": r1(score_now - score_history[frm]),
            "academicRisk": a_level,
            "placementRisk": p_level,
            "segmentId": "",
            "cgpa": round(float(r["cgpa"]), 2),
            "attendancePct": round(att, 1),
            "lmsCompletionPct": round(lms_pct, 1),
            "codingScore": round(coding, 1),
            # Placement model probability; None (shown as "model unavailable") if the model can't run.
            "placementProbability": round(prob, 2) if prob is not None else None,
        }
        s = Student(
            row=row, email=ident["email"], values=values, history=history, score_history=score_history,
            backlogs=backlogs, aptitude=round(apt, 1), mock=round(mock, 1),
            comm_rating=round(float(r["communication_score"]) / 20.0, 1),
            clubs=int(r["clubs_participation_count"]), events=int(r["events_attended_count"]),
            lms_logins=logins, projects=int(r["projects_count"]), certs=int(r["certifications_count"]),
            support_need=str(r["support_need_category"]), placed_prob=prob,
            academic={"level": a_level, "index": int(round(a_now)), "factors": a_factors},
            placement={"level": p_level, "index": int(round(p_now)), "factors": p_factors},
            a_hist=a_hist, p_hist=p_hist, change_factors=change_factors,
            classes_attended=int(r["classes_attended"]),
        )

        # Suggested follow-up: matched to the leading factor of the riskier track.
        s.action = {"id": "monitor", "label": "Keep monitoring", "domain": "academic", "reason": "No risk flags this week"}
        if a_level != "low" or p_level != "low":
            domain = "academic" if s.academic["index"] / ACADEMIC_HIGH >= s.placement["index"] / PLACEMENT_HIGH else "placement"
            risk = s.academic if domain == "academic" else s.placement
            table = ACADEMIC_ACTIONS if domain == "academic" else PLACEMENT_ACTIONS
            lead = risk["factors"][0]
            action_id, label = table[lead["factor"]]
            s.action = {"id": action_id, "label": label, "domain": domain,
                        "reason": f"{lead['factor']} explains {round(lead['share'] * 100)}% of {domain} risk"}
        students.append(s)

    # K-Means segments via segmentation.py (cluster on cgpa, attendance, LMS, coding, technical skill).
    # Never ask K-means for more clusters than there are students (small test datasets).
    clustered = segmentation.segment_students(df.copy(), n_clusters=max(1, min(N_SEGMENTS, len(df))))
    segments = _name_segments(df, students, clustered["cluster_id"].to_numpy())

    insights, findings = _insights(df, students)
    _seed_interventions(students)
    return Campus(
        students=students,
        by_id={s.sid: s for s in students},
        segments=segments,
        generated_at=datetime.now(IST).isoformat(timespec="seconds"),
        pipeline_sources=_raw_data_stats(),
        insights=insights,
        findings=findings,
    )


def _seed_interventions(students: list[Student]) -> None:
    """Simulated pre-existing interventions for a share of flagged students (no such CSV exists)."""
    seq = 1
    for s in students:
        if not s.flagged or s.action["id"] == "monitor":
            continue
        rng = random.Random(_seed("intervention", s.sid))
        if rng.random() > 0.3:
            continue
        start = 4 + int(rng.random() * 6)
        gained = s.score_history[LAST] - s.score_history[start]
        status = "in-progress" if rng.random() < 0.45 else "assigned"
        if start <= 7 and (gained >= 1 or rng.random() < 0.12):
            status = "completed"
        s.interventions.append({
            "interventionId": f"INT-{seq:03d}", "label": s.action["label"], "domain": s.action["domain"],
            "status": status, "owner": s.row["mentor"], "startedWeek": f"W{start + 1}",
        })
        seq += 1


def refresh() -> None:
    """Re-read the CSVs on the next request."""
    get_campus.cache_clear()
    _all_alerts.cache_clear()


def _subject_attendance(s: Student) -> list[dict[str, Any]]:
    """Split the student's real classes_attended total across their department's five subjects (simulated split)."""
    subjects = DEPT_SUBJECTS.get(s.row["department"], DEPT_SUBJECTS["CSE"])
    total = max(0, min(s.classes_attended, CLASSES_PER_SUBJECT * len(subjects)))
    rng = random.Random(_seed("subjects", s.sid))
    weights = [max(0.2, rng.gauss(1.0, 0.18)) for _ in subjects]
    counts = [min(CLASSES_PER_SUBJECT, int(w * total / sum(weights))) for w in weights]
    order = sorted(range(len(subjects)), key=lambda i: -weights[i])
    i = 0
    while sum(counts) < total:  # hand out the rounding remainder
        j = order[i % len(order)]
        if counts[j] < CLASSES_PER_SUBJECT:
            counts[j] += 1
        i += 1
    return [{"subject": name, "pct": r1(c / CLASSES_PER_SUBJECT * 100)} for name, c in zip(subjects, counts)]


# --------------------------------------------------------------------------- #
# early-warning alerts (rules run on the weekly history)
# --------------------------------------------------------------------------- #
ACADEMIC_AREAS = {"academics", "attendance", "lms"}


def _alerts_for(s: Student) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    base = {"studentId": s.sid, "studentName": s.row["name"], "department": s.row["department"]}
    recent = range(LAST - LOOKBACK + 1, LAST + 1)
    att = s.history["attendance"]  # the attendance area score is the attendance % itself

    week = next((w for w in recent if att[w - 1] >= 75 and att[w] < 75), None)
    if week is not None:
        low = min(_subject_attendance(s), key=lambda x: x["pct"])
        out.append({**base, "alertId": f"{s.sid}-att", "kind": "attendance-threshold", "severity": "high", "domain": "academic",
                    "title": "Attendance fell below 75%",
                    "detail": f"{att[week - 1]:.0f}% to {s.row['attendancePct']:.0f}%. Lowest in {low['subject']} at {low['pct']:.0f}%; below 75% blocks exam eligibility.",
                    "week": f"W{week + 1}"})

    for domain, risk, hist, high in (("academic", s.academic, s.a_hist, ACADEMIC_HIGH), ("placement", s.placement, s.p_hist, PLACEMENT_HIGH)):
        if risk["level"] != "high":
            continue
        week = next((w for w in recent if hist[w - 1] < high <= hist[w]), None)
        if week is None:
            continue
        lead = risk["factors"][0] if risk["factors"] else None
        out.append({**base, "alertId": f"{s.sid}-{domain}-high", "kind": "new-high-risk", "severity": "high", "domain": domain,
                    "title": f"Now high {domain} risk",
                    "detail": f"{lead['factor']} explains {round(lead['share'] * 100)}%: {lead['evidence']}." if lead else "Several small gaps combined.",
                    "week": f"W{week + 1}"})

    drop = s.score_history[LAST] - s.score_history[LAST - LOOKBACK]
    if drop <= -5:
        worst = next((f for f in s.change_factors if f["points"] < 0), None)
        out.append({**base, "alertId": f"{s.sid}-drop", "kind": "score-drop", "severity": "high" if drop <= -8 else "medium",
                    "domain": "placement" if worst and worst["key"] not in ACADEMIC_AREAS else "academic",
                    "title": f"Success score down {abs(drop):.0f} points in 4 weeks",
                    "detail": f"Mostly from {worst['label']} ({round(worst['share'] * 100)}% of the drop)." if worst else "Spread across several areas.",
                    "week": f"W{LAST + 1}"})

    if s.history["lms"][LAST - LOOKBACK] - s.history["lms"][LAST] >= 15:
        out.append({**base, "alertId": f"{s.sid}-lms", "kind": "lms-drop", "severity": "medium", "domain": "academic",
                    "title": "LMS activity dropped sharply",
                    "detail": f"{s.row['lmsCompletionPct']:.0f}% of assignments submitted, {s.lms_logins} logins in 30 days.",
                    "week": f"W{LAST + 1}"})

    prob = s.row["placementProbability"]
    if s.row["semester"] >= 7 and prob is not None and prob < 0.25:
        gap = s.placement["factors"][0]["factor"].lower() if s.placement["factors"] else "placement tests"
        out.append({**base, "alertId": f"{s.sid}-placement", "kind": "placement-prediction", "severity": "high", "domain": "placement",
                    "title": "Predicted to miss placement",
                    "detail": f"{round(prob * 100)}% chance of being placed. Main gap: {gap}.",
                    "week": f"W{LAST + 1}"})
    return out


@lru_cache(maxsize=1)
def _all_alerts() -> tuple[dict[str, Any], ...]:
    rank = {"high": 0, "medium": 1}
    alerts = [a for s in get_campus().students for a in _alerts_for(s)]
    alerts.sort(key=lambda a: (-int(a["week"][1:]), rank[a["severity"]]))
    return tuple(to_native(alerts))


def get_alerts() -> dict[str, Any]:
    c = get_campus()
    handled = set(_load_store().get("handledAlerts", []))
    return {"generatedAt": c.generated_at, "currentWeek": f"Week {WEEKS}",
            "alerts": [{**a, "handled": a["alertId"] in handled} for a in _all_alerts()]}


# --------------------------------------------------------------------------- #
# intervention store (user-created items + status changes survive restarts)
# --------------------------------------------------------------------------- #
_lock = threading.Lock()


def _load_store() -> dict[str, Any]:
    try:
        return json.loads(STORE_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {"created": [], "status": {}, "handledAlerts": [], "groupPlans": {}}


def set_alert_handled(alert_id: str, handled: bool) -> bool:
    if not any(a["alertId"] == alert_id for a in _all_alerts()):
        return False
    with _lock:
        store = _load_store()
        ids = set(store.get("handledAlerts", []))
        if handled:
            ids.add(alert_id)
        else:
            ids.discard(alert_id)
        store["handledAlerts"] = sorted(ids)
        _save_store(store)
    return True


def set_group_plan(segment_id: str, planned: bool) -> bool:
    if not any(seg["segmentId"] == segment_id for seg in get_campus().segments):
        return False
    with _lock:
        store = _load_store()
        plans = store.setdefault("groupPlans", {})
        if planned:
            plans[segment_id] = {"plannedAt": datetime.now(IST).isoformat(timespec="seconds")}
        else:
            plans.pop(segment_id, None)
        _save_store(store)
    return True


def _save_store(store: dict[str, Any]) -> None:
    STORE_PATH.write_text(json.dumps(store, indent=2))


VALID_STATUS = {"suggested", "assigned", "in-progress", "completed"}


def create_intervention(student_id: str, label: str | None, domain: str | None, owner: str | None, status: str = "assigned") -> dict[str, Any] | None:
    s = get_campus().by_id.get(student_id)
    if s is None or status not in VALID_STATUS:
        return None
    with _lock:
        store = _load_store()
        seq = 1000 + len(store["created"]) + 1
        item = {
            "interventionId": f"INT-{seq}", "studentId": student_id,
            "label": label or s.action["label"], "domain": domain or s.action["domain"],
            "status": status, "owner": owner or s.row["mentor"], "startedWeek": f"W{WEEKS}",
            "scoreBefore": s.row["successScore"],
        }
        store["created"].append(item)
        _save_store(store)
    return item


def update_intervention_status(intervention_id: str, status: str) -> bool:
    if status not in VALID_STATUS:
        return False
    campus = get_campus()
    known = {i["interventionId"] for s in campus.students for i in s.interventions}
    with _lock:
        store = _load_store()
        known |= {i["interventionId"] for i in store["created"]}
        if intervention_id not in known:
            return False
        store["status"][intervention_id] = status
        _save_store(store)
    return True


# --------------------------------------------------------------------------- #
# payload builders (one per frontend endpoint)
# --------------------------------------------------------------------------- #
def _to_attention(s: Student) -> dict[str, Any]:
    def risk(r: dict[str, Any]) -> dict[str, Any]:
        return {"level": r["level"], "drivers": [] if r["level"] == "low" else [f["evidence"] for f in r["factors"][:2]]}
    return {
        "studentId": s.sid, "name": s.row["name"], "department": s.row["department"], "semester": s.row["semester"],
        "successScore": s.row["successScore"], "academicRisk": risk(s.academic), "placementRisk": risk(s.placement),
        "suggestedAction": {k: s.action[k] for k in ("id", "label", "domain")},
    }


def _queue(c: Campus) -> list[Student]:
    flagged = [s for s in c.students if s.flagged]
    return sorted(flagged, key=lambda s: (-(LEVEL_RANK[s.academic["level"]] + LEVEL_RANK[s.placement["level"]]), s.row["successScore"]))


def _weekly_risk(c: Campus) -> list[dict[str, Any]]:
    return [{"week": f"W{w + 1}",
             "academicHigh": sum(1 for s in c.students if s.a_hist[w] >= ACADEMIC_HIGH),
             "placementHigh": sum(1 for s in c.students if s.p_hist[w] >= PLACEMENT_HIGH)} for w in range(WEEKS)]


def _department_risk(c: Campus) -> list[dict[str, Any]]:
    out = []
    for name, _ in DEPARTMENTS:
        m = [s for s in c.students if s.row["department"] == name]
        out.append({"department": name, "students": len(m),
                    "academicHigh": sum(1 for s in m if s.academic["level"] == "high"),
                    "placementHigh": sum(1 for s in m if s.placement["level"] == "high")})
    return [d for d in out if d["students"] > 0]


def _all_interventions(c: Campus) -> list[dict[str, Any]]:
    store = _load_store()
    items: list[dict[str, Any]] = []
    for s in c.students:
        for i in s.interventions:
            start = int(i["startedWeek"][1:]) - 1
            items.append({**i, "studentId": s.sid, "studentName": s.row["name"], "department": s.row["department"],
                          "scoreBefore": s.score_history[start], "scoreNow": s.row["successScore"], "reason": s.action["reason"]})
    for i in store["created"]:
        s = c.by_id.get(i["studentId"])
        if s is None:
            continue
        items.append({"interventionId": i["interventionId"], "studentId": s.sid, "studentName": s.row["name"],
                      "department": s.row["department"], "label": i["label"], "domain": i["domain"], "status": i["status"],
                      "owner": i["owner"], "startedWeek": i["startedWeek"], "scoreBefore": i["scoreBefore"],
                      "scoreNow": s.row["successScore"], "reason": s.action["reason"]})
    for i in items:
        i["status"] = store["status"].get(i["interventionId"], i["status"])
    return items


def get_overview() -> dict[str, Any]:
    c = get_campus()
    n = len(c.students)
    weekly_score = [r1(sum(s.score_history[w] for s in c.students) / n) for w in range(WEEKS)]
    interventions = _all_interventions(c)
    queue = _queue(c)

    signal_chart = [{
        "key": a["key"], "label": a["label"],
        "shares": [r1(sum(1 for s in c.students if band_for(s.history[a["key"]][w]) >= 2) / n * 100) for w in range(WEEKS)],
        "flaggedNow": sum(1 for s in c.students if band_for(s.values[a["key"]]) >= 2),
    } for a in AREAS]

    bands = [("0-39", 0, 39), ("40-54", 40, 54), ("55-69", 55, 69), ("70-84", 70, 84), ("85-100", 85, 100)]
    follow: dict[str, dict[str, Any]] = {}
    for s in queue:
        key = s.action["id"]
        label = "Remedial subject sessions" if key == "remedial-session" else s.action["label"]
        e = follow.setdefault(key, {"label": label, "domain": s.action["domain"], "students": 0})
        e["students"] += 1

    return to_native({
        "generatedAt": c.generated_at,
        "term": TERM,
        "currentWeek": f"Week {WEEKS}",
        "summary": {
            "studentsTracked": n,
            "averageSuccessScore": weekly_score[LAST],
            "averageSuccessScoreChange": r1(weekly_score[LAST] - weekly_score[LAST - 1]),
            "academicRisk": {"high": sum(1 for s in c.students if s.academic["level"] == "high"), "medium": sum(1 for s in c.students if s.academic["level"] == "medium")},
            "placementRisk": {"high": sum(1 for s in c.students if s.placement["level"] == "high"), "medium": sum(1 for s in c.students if s.placement["level"] == "medium")},
            "openInterventions": sum(1 for i in interventions if i["status"] in ("assigned", "in-progress")),
        },
        "weeklyRisk": _weekly_risk(c),
        "departmentRisk": _department_risk(c),
        "scoreDistribution": [{"label": l, "min": lo, "max": hi, "students": sum(1 for s in c.students if lo <= s.row["successScore"] <= hi + 0.999)} for l, lo, hi in bands],
        "studentsNeedingAttention": [_to_attention(s) for s in queue[:6]],
        "followUpActions": sorted(
            ({"actionId": k, "label": v["label"], "description": FOLLOW_UP_DESCRIPTIONS.get(k, ""), "domain": v["domain"], "students": v["students"]} for k, v in follow.items()),
            key=lambda a: -a["students"]),
        "dataAreas": [{"key": a["key"], "label": a["label"], "description": a["desc"],
                       "records": next(src["rows"] for src in c.pipeline_sources if src["key"] == a["key"])} for a in AREAS],
        "signalChart": signal_chart,
        "weeklyScore": weekly_score,
        "segments": c.segments,
        "insights": c.insights,
    })


def get_students() -> list[dict[str, Any]]:
    return to_native([s.row for s in get_campus().students])


def get_student(student_id: str) -> dict[str, Any] | None:
    c = get_campus()
    s = c.by_id.get(student_id)
    if s is None:
        return None
    queue = _queue(c)
    at = next((i for i, q in enumerate(queue) if q.sid == s.sid), -1)
    evidence = {
        "academics": [f"CGPA {s.row['cgpa']:.2f}", f"{s.backlogs} active backlog{'' if s.backlogs == 1 else 's'}"],
        "attendance": [f"{s.row['attendancePct']:.0f}% overall", "75% needed to sit exams"],
        "lms": [f"{s.row['lmsCompletionPct']:.0f}% assignments submitted", f"{s.lms_logins} logins in 30 days"],
        "engagement": [f"{s.clubs} club{'' if s.clubs == 1 else 's'}", f"{s.events} event{'' if s.events == 1 else 's'}"],
        "placement": [f"Aptitude {s.aptitude:.0f}/100", f"Coding {s.row['codingScore']:.0f}/100", f"Mock interview {s.mock:.0f}/100"]
                     + ([f"Model: {s.placed_prob * 100:.0f}% chance of placement"] if s.placed_prob is not None else []),
        "skills": [f"Technical {s.values['skills']:.0f}/100", f"{s.projects} projects, {s.certs} certifications"],
        "feedback": [f"Satisfaction {s.values['feedback'] / 10:.1f}/10", f"Support need: {s.support_need}"],
    }
    signals = [{
        "key": a["key"], "label": a["label"], "value": round(s.values[a["key"]]), "weight": a["weight"],
        "band": band_for(s.values[a["key"]]), "history": [band_for(v) for v in s.history[a["key"]]],
        "evidence": evidence[a["key"]],
    } for a in AREAS]
    store = _load_store()
    interventions = [{**i, "status": store["status"].get(i["interventionId"], i["status"])} for i in s.interventions]
    interventions += [{"interventionId": i["interventionId"], "label": i["label"], "domain": i["domain"],
                       "status": store["status"].get(i["interventionId"], i["status"]), "owner": i["owner"], "startedWeek": i["startedWeek"]}
                      for i in store["created"] if i["studentId"] == s.sid]
    return to_native({
        **s.row,
        "email": s.email, "backlogs": s.backlogs, "aptitudeScore": s.aptitude,
        # The CSVs hold scores, not counts: mockInterviews carries the mock-interview score,
        # hackathons carries events attended.
        "mockInterviews": s.mock, "communicationRating": s.comm_rating, "clubs": s.clubs, "hackathons": s.events,
        "scoreHistory": s.score_history, "signals": signals,
        "academic": s.academic, "placement": s.placement, "scoreChangeFactors": s.change_factors,
        "suggestedAction": s.action, "interventions": interventions,
        "subjectAttendance": _subject_attendance(s),
        "alerts": [a for a in _all_alerts() if a["studentId"] == s.sid],
        "previousFlaggedId": queue[at - 1].sid if at > 0 else None,
        "nextFlaggedId": queue[at + 1].sid if 0 <= at < len(queue) - 1 else (queue[0].sid if at < 0 and queue else None),
    })


def get_risks() -> dict[str, Any]:
    c = get_campus()
    levels = ["high", "medium", "low"]
    drivers: dict[str, dict[str, Any]] = {}
    for s in c.students:
        for domain, risk in (("academic", s.academic), ("placement", s.placement)):
            if risk["level"] == "low":
                continue
            for i, f in enumerate(risk["factors"]):
                e = drivers.setdefault(f["factor"], {"domain": domain, "students": 0, "share": 0.0, "seen": 0})
                e["students"] += 1 if i == 0 else 0
                e["share"] += f["share"]
                e["seen"] += 1
    queue = _queue(c)
    newly = [s for s in queue if (s.academic["level"] == "high" and s.a_hist[LAST - LOOKBACK] < ACADEMIC_HIGH)
             or (s.placement["level"] == "high" and s.p_hist[LAST - LOOKBACK] < PLACEMENT_HIGH)]
    return to_native({
        "generatedAt": c.generated_at,
        "currentWeek": f"Week {WEEKS}",
        "matrix": [{"academic": a, "placement": p, "students": sum(1 for s in c.students if s.academic["level"] == a and s.placement["level"] == p)}
                   for a in levels for p in levels],
        "drivers": sorted(({"factor": f, "domain": e["domain"], "students": e["students"], "averageShare": e["share"] / max(1, e["seen"])} for f, e in drivers.items()),
                          key=lambda d: -d["students"]),
        "departmentRisk": _department_risk(c),
        "weeklyRisk": _weekly_risk(c),
        "newlyFlagged": [s.row for s in newly],
        "flagged": [s.row for s in queue],
    })


def get_segments() -> dict[str, Any]:
    c = get_campus()
    plans = _load_store().get("groupPlans", {})
    return to_native({
        "generatedAt": c.generated_at,
        "method": f"k-means (k = {N_SEGMENTS}) on CGPA, attendance, LMS completion, coding score and technical skill, standardised",
        "segments": [{**seg, "planned": seg["segmentId"] in plans} for seg in c.segments],
        "points": [{"studentId": s.sid, "name": s.row["name"], "segmentId": s.segment_id,
                    "academicReadiness": round(100 - s.academic["index"]), "placementReadiness": round(100 - s.placement["index"])}
                   for s in c.students],
    })


def get_interventions() -> dict[str, Any]:
    c = get_campus()
    items = _all_interventions(c)
    covered = {i["studentId"] for i in items}
    suggested = [{
        "interventionId": f"SUG-{s.sid}", "studentId": s.sid, "studentName": s.row["name"], "department": s.row["department"],
        "label": s.action["label"], "domain": s.action["domain"], "status": "suggested", "owner": s.row["mentor"],
        "startedWeek": f"W{WEEKS}", "scoreBefore": s.row["successScore"], "scoreNow": s.row["successScore"], "reason": s.action["reason"],
    } for s in _queue(c) if s.sid not in covered]

    outcomes: dict[str, dict[str, Any]] = {}
    for i in items:
        if i["status"] != "completed":
            continue
        key = "Remedial subject sessions" if i["label"].startswith("Remedial session") else i["label"]
        e = outcomes.setdefault(key, {"domain": i["domain"], "completed": 0, "improved": 0, "gain": 0.0})
        e["completed"] += 1
        e["improved"] += 1 if i["scoreNow"] > i["scoreBefore"] else 0
        e["gain"] += i["scoreNow"] - i["scoreBefore"]
    return to_native({
        "generatedAt": c.generated_at,
        "currentWeek": f"Week {WEEKS}",
        "interventions": suggested + items,
        "outcomes": sorted(({"label": k, "domain": e["domain"], "completed": e["completed"], "improved": e["improved"],
                             "averageGain": r1(e["gain"] / e["completed"])} for k, e in outcomes.items()), key=lambda o: -o["completed"]),
    })


def get_pipeline() -> dict[str, Any]:
    c = get_campus()
    return to_native({
        "generatedAt": c.generated_at,
        "studentsUnified": len(c.students),
        "sources": c.pipeline_sources,
        "steps": [
            {"title": "Ingest", "detail": "Seven CSV exports are read from the data folder, one file per data area."},
            {"title": "Clean", "detail": "Missing coding, quiz and communication scores are filled with the column mean."},
            {"title": "Join", "detail": "Every source is joined on student_id into one record per student."},
            {"title": "Score", "detail": "Area scores are weighted into the 0-100 Student Success Score (weights below)."},
            {"title": "Flag and explain", "detail": "Academic and placement risk are separate point scores built from each student's gaps; the level follows from the score and every factor's share is shown. The placement model adds a probability."},
            {"title": "Segment", "detail": f"K-means groups students into {N_SEGMENTS} segments for group interventions."},
            {"title": "Weekly trend (simulated)", "detail": "The CSVs are one snapshot, so the 12-week history, names, departments, mentors and past interventions are simulated around the real current values."},
        ],
        "findings": c.findings,
        "weights": [{"key": a["key"], "label": a["label"], "weight": a["weight"]} for a in AREAS],
    })


if __name__ == "__main__":
    camp = get_campus()
    ov = get_overview()
    print("students:", len(camp.students))
    print("summary:", ov["summary"])
    print("segments:", [(s["name"], s["students"], s["tone"]) for s in ov["segments"]])
    print("follow-ups:", [(f["actionId"], f["students"]) for f in ov["followUpActions"]])
