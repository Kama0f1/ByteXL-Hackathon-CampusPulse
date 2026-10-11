# Student Success Score: short note

How CampusPulse turns seven data sources into one score per student and two explained risk flags. Numbers are from the 1,000 students in `data/`.

## 1. The Success Score (0–100)

Each data area becomes a 0–100 value, then the seven are combined with fixed weights.

| Area | Source file | Indicator used | Weight |
|---|---|---|---|
| Academics | Academic.csv | CGPA × 10 | 25% |
| Attendance | Attendance.csv | Overall attendance % | 20% |
| Placement readiness | Placement.csv | Mean of aptitude and coding scores | 20% |
| LMS activity | LMS.csv | Assignment completion % | 15% |
| Skills | Skills.csv | Technical skill score | 10% |
| Engagement | Engagement.csv | (Clubs + events) × 10, capped at 100 | 5% |
| Feedback | Feedback.csv | Satisfaction score × 10 | 5% |

**Score = 0.25·Academics + 0.20·Attendance + 0.20·Placement + 0.15·LMS + 0.10·Skills + 0.05·Engagement + 0.05·Feedback**

**Why these weights:**
- **Heaviest four:** academics, attendance, placement readiness and LMS move with grades and placement outcomes in this data.
- **Engagement and feedback (5% each):** clubs and events correlate with CGPA at r = 0.00 and with placement at r = −0.03, so they carry little weight.
- **Skills (10%):** technical skill is an exact copy of the coding score in this dataset, so a higher weight would count coding twice.

**Does it work?** The score never sees placement outcomes, yet placed students average 74.8 and others 64.8. On its own it separates the two groups with an AUC of 0.80. Campus average: 67.5 (range 39–95).

**Explained per student:** each profile shows every area's weight times its gap from 100, so a mentor sees which area costs the most points.

## 2. Two risk flags, kept separate

A topper can still be unready for placements, so academic and placement risk are never merged. Each risk is a 0–100 index built from factor points. A factor earns points as the student falls below a healthy level, up to its maximum. The level follows from the index, so the factor percentages on a profile are exactly what produced the flag.

| Academic risk | Max points | Placement risk | Max points |
|---|---|---|---|
| CGPA (0 at 7.5+, full at 4.5) | 35 | Coding + aptitude average (0 at 75+, full at 30) | 70 |
| Attendance (0 at 85%+, full at 60%) | 35 | Mock interview (0 at 75+, full at 25) | 15 |
| Active backlogs (full at 3) | 20 | CGPA cut-off (0 at 7.0+, full at 5.0) | 10 |
| LMS completion (0 at 80%+, full at 30%) | 10 | Projects (0 at 3+, full at none) | 5 |
| **High ≥ 45, medium ≥ 28** | | **High ≥ 50, medium ≥ 30** | |

**Result:** 232 students are high academic risk, 251 high placement risk, and 102 are high on both.

**Why coding and aptitude carry 70 points:** every placed student with a recorded coding score (248) averages at least 70 across coding and aptitude. None of the 690 students below that line were placed.

**Why not "attendance below 75% = high risk":** that rule flags 558 of 1,000 students, so it cannot tell faculty who to help first. The 75% exam rule is still raised as its own alert.

## 3. Worked example: STU004

- **Success Score:** 58.6.
- **Academic risk: high (68).** Attendance (54%) explains 51%, 3 backlogs 29%, CGPA 6.60 15%, LMS work 4%.
- **Placement risk: high (53).** Coding and aptitude (60 and 40) explain 74%, mock interview 19%, CGPA cut-off 4%, projects 3%.
- **Suggested step:** mentor call and attendance plan, because attendance leads the riskier track.

## 4. Placement model and segments

- **Placement probability:** a saved scikit-learn model (`placement_model.joblib`) predicts each student's chance of placement from CGPA, backlogs, attendance, assignment completion, quiz average, technical skill and communication. It scores AUC 0.97 on these 1,000 students, with no held-out test yet. It is shown next to the placement risk, not blended into it.
- **Segments:** K-means (k = 6) on CGPA, attendance, LMS completion, coding and technical skill. Each cluster is named by its academic vs placement standing:

| Segment | Students |
|---|---|
| Steady achievers | 206 |
| High academics, low placement readiness | 179 |
| Placement-ready, academically at risk | 119 |
| Middle of the pack | 234 |
| Low placement readiness | 129 |
| Needs broad support | 133 |

## 5. Real vs simulated

- **Real, from the CSVs:** every input, the score, both risk indices and their reasons, the model probability, segments and insights.
- **Simulated:** the data is anonymised and a single snapshot, so names, departments, the subject-wise attendance split (it adds up to each student's real total) and the 12-week history behind the trend charts are simulated.
