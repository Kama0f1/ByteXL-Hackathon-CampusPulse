"""
Academic and placement risk, scored separately and explained factor by factor.

Each risk index (0-100, higher is riskier) is a sum of factor points. A factor earns points as
the student falls below a healthy level, up to that factor's maximum. The level (high / medium /
low) comes from the index, so the factor shares shown on a profile are exactly what produced the
flag. Thresholds were calibrated on the 1,000-student dataset so that "high" picks out roughly
the most urgent fifth of students instead of most of the campus.

(The earlier SRS rule "attendance under 75% = high risk" flagged 572 of 1,000 students, because
558 are under 75%. The 75% exam-eligibility rule is still raised as its own attendance alert.)

Inputs are the same 0-100 area values used for the Success Score (academics = CGPA x 10,
attendance = attendance %, lms = assignment completion %, placement = mean of coding and
aptitude), so the identical rules also score every week of the term history.
"""

ACADEMIC_HIGH, ACADEMIC_MEDIUM = 45, 28
PLACEMENT_HIGH, PLACEMENT_MEDIUM = 50, 30


def _gap(value: float, healthy: float, span: float) -> float:
    """0 at or above the healthy level, rising to 1 when `span` below it."""
    return min(1.0, max(0.0, (healthy - value) / span))


def academic_points(academics: float, attendance: float, lms: float, backlogs: int) -> dict[str, float]:
    """Max points: CGPA 35, attendance 35, backlogs 20, LMS 10 (sums to 100)."""
    return {
        "Internal marks and CGPA": 35 * _gap(academics / 10, 7.5, 3),  # CGPA 4.5 or lower = full points
        "Attendance": 35 * _gap(attendance, 85, 25),  # under 60% alone is enough for medium risk
        "Active backlogs": 20 * min(1.0, backlogs / 3),
        "LMS assignment completion": 10 * _gap(lms, 80, 50),
    }


def placement_points(coding_aptitude: float, mock: float, cgpa: float, projects: int) -> dict[str, float]:
    """Max points: coding + aptitude 70, mock interview 15, CGPA cut-off 10, projects 5 (sums to 100)."""
    return {
        # In this dataset every placed student averages 70+ across coding and aptitude.
        "Aptitude and coding tests": 70 * _gap(coding_aptitude, 75, 45),
        "Mock interview practice": 15 * _gap(mock, 75, 50),
        "CGPA cut-off": 10 * _gap(cgpa, 7, 2),  # 7.0 is a common recruiter cut-off
        "Project portfolio": 5 * _gap(projects, 3, 3),
    }


def level(index: float, high: float, medium: float) -> str:
    return "high" if index >= high else "medium" if index >= medium else "low"


def explain(points: dict[str, float], evidence: dict[str, str], min_share: float = 0.06) -> list[dict]:
    """Factor shares of the index, largest first, summing to exactly 1 (factors under 6% dropped)."""
    kept = sorted(((f, p) for f, p in points.items() if p > 0), key=lambda x: -x[1])
    total = sum(p for _, p in kept)
    if total <= 0:
        return []
    significant = [(f, p) for f, p in kept if p / total >= min_share]
    sig_total = sum(p for _, p in significant)
    shares = [round(p / sig_total * 100) for _, p in significant]
    shares[0] += 100 - sum(shares)
    return [{"factor": f, "share": s / 100, "evidence": evidence[f]} for (f, _), s in zip(significant, shares)]
