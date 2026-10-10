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
RISK_HIGH = 61
RISK_MEDIUM = 50
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
    "Technical and soft skills": ("soft-skills", "Soft-skills and communication workshop"),
    "Engagement and projects": ("project-referral", "Project or internship referral"),
    "Mock interview practice": ("mock-interview", "Book a mock interview slot"),
}
FOLLOW_UP_DESCRIPTIONS = {
    "mentor-call": "Students with low or falling attendance.",
    "remedial-session": "Students whose internal marks are the main concern.",
    "lms-catch-up": "Students who have stopped submitting LMS work.",
    "backlog-clearance": "Students carrying active backlogs.",
    "placement-bootcamp": "Low aptitude or coding test scores.",
    "soft-skills": "Low communication or skills ratings.",
    "project-referral": "Few projects, clubs or events on record.",
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


def level_from_index(index: float) -> str:
    return "high" if index >= RISK_HIGH else "medium" if index >= RISK_MEDIUM else "low"


def _align(raw: float, level: str) -> float:
    """Keep the 0-100 risk index consistent with the SRS level from risk_engine.py."""
    if level == "high":
        return clamp(max(raw, RISK_HIGH), 0, 100)
    if level == "medium":
        return clamp(raw, RISK_MEDIUM, RISK_HIGH - 1)
    return clamp(min(raw, RISK_MEDIUM - 1), 0, 100)


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


def _academic_raw(v: dict[str, float], backlogs: int) -> float:
    base = 100 - (0.4 * v["academics"] + 0.35 * v["attendance"] + 0.25 * v["lms"])
    return clamp(base * 1.18 + backlogs * 4 + (6 if v["attendance"] < 52 else 0), 0, 100)


def _placement_raw(v: dict[str, float]) -> float:
    return clamp(100 - (0.55 * v["placement"] + 0.30 * v["skills"] + 0.15 * v["engagement"]), 0, 100)


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

    used: set[str] = set()
    segments = []
    for c in clusters:
        ranked = sorted(AREA_KEYS, key=lambda k: c["profile"][k])
        worst, best = ranked[0], ranked[-1]
        tone = "strong" if c["avg"] >= 70 else "mixed" if c["avg"] >= 60 else "watch" if c["avg"] >= 52 else "support"
        if tone == "strong":
            name = "Steady achievers" if "Steady achievers" not in used else f"High achievers, low {lower_label(AREA_LABEL[worst])}"
            desc = "Strong across most areas. Keep them stretched, not just monitored."
            group = ("Peer-mentor programme", "academic", "Pair with students in slipping segments as study mentors.")
        elif tone == "support":
            name, desc = "Needs broad support", "Low across most areas. Best served by one coordinated plan, not several separate ones."
            group = ("Coordinated support plan", "academic", "Mentor, counsellor and placement cell agree one weekly plan.")
        else:
            name = f"Strong {lower_label(AREA_LABEL[best])}, low {lower_label(AREA_LABEL[worst])}"
            desc = (f"Averages {round(c['profile'][best])} on {lower_label(AREA_LABEL[best])} "
                    f"but only {round(c['profile'][worst])} on {lower_label(AREA_LABEL[worst])}.")
            group = GROUP_INTERVENTIONS[worst]
        if name in used:  # keep names unique
            name = f"{name} ({lower_label(AREA_LABEL[ranked[1]])} also low)"
        used.add(name)
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

        # Risk levels use the SRS thresholds already written in risk_engine.py.
        a_level, a_flags = risk_engine.assess_academic_risk(r)
        p_level, readiness, p_flags = risk_engine.assess_placement_risk(r)
        a_level, p_level = a_level.lower(), p_level.lower()
        prob = float(probs[i]) if probs is not None else None

        a_raw_hist = [_academic_raw({k: history[k][w] for k in AREA_KEYS}, backlogs) for w in range(WEEKS)]
        p_raw_hist = [_placement_raw({k: history[k][w] for k in AREA_KEYS}) for w in range(WEEKS)]
        a_now = _align(_academic_raw(values, backlogs), a_level)
        p_base = 100 - readiness
        p_now = _align(0.6 * p_base + 0.4 * (100 - prob * 100) if prob is not None else p_base, p_level)
        # The SRS thresholds are applied to ONE snapshot, so past weeks stay inside today's level
        # band. (Letting them drift across the thresholds would draw a fake "rising risk" trend.)
        a_hist = [_align(a_now + (x - a_raw_hist[LAST]), a_level) for x in a_raw_hist]
        p_hist = [_align(p_now + (x - p_raw_hist[LAST]), p_level) for x in p_raw_hist]

        att, lms_pct = float(r["attendance_pct"]), float(r["assignment_completion_pct"])
        logins = int(r["lms_logins_30d"])
        a_factors = normalise_factors([
            {"factor": "Internal marks and CGPA", "gap": 0.4 * max(0, 75 - values["academics"]), "evidence": f"CGPA {r['cgpa']:.2f} out of 10"},
            {"factor": "Attendance", "gap": 0.35 * max(0, 80 - values["attendance"]), "evidence": f"{att:.0f}% attendance (75% needed to sit exams)"},
            {"factor": "LMS assignment completion", "gap": 0.25 * max(0, 75 - values["lms"]), "evidence": f"{lms_pct:.0f}% of assignments submitted, {logins} logins in 30 days"},
            {"factor": "Active backlogs", "gap": backlogs * 4, "evidence": f"{backlogs} active backlog{'' if backlogs == 1 else 's'}"},
        ])
        coding, apt, mock = float(r["coding_score"]), float(r["aptitude_score"]), float(r["mock_interview_score"])
        p_factors = normalise_factors([
            {"factor": "Aptitude and coding tests", "gap": 0.45 * max(0, 75 - values["placement"]), "evidence": f"Aptitude {apt:.0f}/100, coding {coding:.0f}/100"},
            {"factor": "Technical and soft skills", "gap": 0.35 * max(0, 72 - values["skills"]), "evidence": f"Technical skills {values['skills']:.0f}/100, communication {r['communication_score']:.0f}/100"},
            {"factor": "Engagement and projects", "gap": 0.2 * max(0, 65 - values["engagement"]), "evidence": f"{int(r['clubs_participation_count'])} clubs, {int(r['events_attended_count'])} events, {int(r['projects_count'])} projects"},
            {"factor": "Mock interview practice", "gap": 0.25 * max(0, 60 - mock), "evidence": f"Mock interview score {mock:.0f}/100"},
        ])
        # A level from risk_engine should always come with at least one explained factor.
        if a_level != "low" and not a_factors:
            text = a_flags[0] if a_flags else "Academic risk flagged"
            name = "Attendance" if "ttendance" in text else "Active backlogs" if "acklog" in text else "Internal marks and CGPA"
            a_factors = [{"factor": name, "share": 1.0, "evidence": text}]
        if p_level != "low" and not p_factors:
            p_factors = [{"factor": "Aptitude and coding tests", "share": 1.0, "evidence": (p_flags[0] if p_flags else "Placement readiness is borderline")}]
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
        )

        # Suggested follow-up: matched to the leading factor of the riskier track.
        s.action = {"id": "monitor", "label": "Keep monitoring", "domain": "academic", "reason": "No risk flags this week"}
        if a_level != "low" or p_level != "low":
            domain = "academic" if s.academic["index"] >= s.placement["index"] else "placement"
            risk = s.academic if domain == "academic" else s.placement
            table = ACADEMIC_ACTIONS if domain == "academic" else PLACEMENT_ACTIONS
            lead = risk["factors"][0]
            action_id, label = table[lead["factor"]]
            s.action = {"id": action_id, "label": label, "domain": domain,
                        "reason": f"{lead['factor']} explains {round(lead['share'] * 100)}% of {domain} risk"}
        students.append(s)

    # K-Means segments via segmentation.py (cluster on cgpa, attendance, LMS, coding, technical skill).
    clustered = segmentation.segment_students(df.copy(), n_clusters=N_SEGMENTS)
    segments = _name_segments(df, students, clustered["cluster_id"].to_numpy())

    _seed_interventions(students)
    return Campus(
        students=students,
        by_id={s.sid: s for s in students},
        segments=segments,
        generated_at=datetime.now(IST).isoformat(timespec="seconds"),
        pipeline_sources=_raw_data_stats(),
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


# --------------------------------------------------------------------------- #
# intervention store (user-created items + status changes survive restarts)
# --------------------------------------------------------------------------- #
_lock = threading.Lock()


def _load_store() -> dict[str, Any]:
    try:
        return json.loads(STORE_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {"created": [], "status": {}}


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
             "academicHigh": sum(1 for s in c.students if s.a_hist[w] >= RISK_HIGH),
             "placementHigh": sum(1 for s in c.students if s.p_hist[w] >= RISK_HIGH)} for w in range(WEEKS)]


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
    newly = [s for s in queue if (s.academic["level"] == "high" and s.a_hist[LAST - LOOKBACK] < RISK_HIGH)
             or (s.placement["level"] == "high" and s.p_hist[LAST - LOOKBACK] < RISK_HIGH)]
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
    return to_native({
        "generatedAt": c.generated_at,
        "method": f"k-means (k = {N_SEGMENTS}) on CGPA, attendance, LMS completion, coding score and technical skill, standardised",
        "segments": c.segments,
        "points": [{"studentId": s.sid, "name": s.row["name"], "segmentId": s.segment_id,
                    "academicReadiness": round(100 - s.academic["index"]), "placementReadiness": round(100 - s.placement["index"])}
                   for s in c.students],
    })


def get_interventions() -> dict[str, Any]:
    c = get_campus()
    items = _all_interventions(c)
    covered = {i["studentId"] for i in items}
    suggested = [{
        "interventionId": f"SUG-{n + 1:03d}", "studentId": s.sid, "studentName": s.row["name"], "department": s.row["department"],
        "label": s.action["label"], "domain": s.action["domain"], "status": "suggested", "owner": s.row["mentor"],
        "startedWeek": f"W{WEEKS}", "scoreBefore": s.row["successScore"], "scoreNow": s.row["successScore"], "reason": s.action["reason"],
    } for n, s in enumerate(x for x in _queue(c) if x.sid not in covered)]

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
            {"title": "Flag and explain", "detail": "Academic and placement risk use the SRS thresholds; each factor's share is shown. The placement model adds a probability."},
            {"title": "Segment", "detail": f"K-means groups students into {N_SEGMENTS} segments for group interventions."},
            {"title": "Weekly trend (simulated)", "detail": "The CSVs are one snapshot, so the 12-week history, names, departments, mentors and past interventions are simulated around the real current values."},
        ],
        "weights": [{"key": a["key"], "label": a["label"], "weight": a["weight"]} for a in AREAS],
    })


if __name__ == "__main__":
    camp = get_campus()
    ov = get_overview()
    print("students:", len(camp.students))
    print("summary:", ov["summary"])
    print("segments:", [(s["name"], s["students"], s["tone"]) for s in ov["segments"]])
    print("follow-ups:", [(f["actionId"], f["students"]) for f in ov["followUpActions"]])
