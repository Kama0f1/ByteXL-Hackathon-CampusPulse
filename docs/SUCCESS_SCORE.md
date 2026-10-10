# The Student Success Score and risk flags

How CampusPulse turns seven data sources into one score per student and two separate risk flags, with the reasons behind every flag. All numbers below are from the 1,000-student dataset in `data/`.

## 1. The Student Success Score (0–100)

Each of the seven data areas is turned into a 0–100 value, then combined with fixed weights.

| Area | Source file | How the 0–100 value is built | Weight |
|---|---|---|---|
| Academics | Academic.csv | CGPA × 10 | 25% |
| Attendance | Attendance.csv | Overall attendance % | 20% |
| Placement readiness | Placement.csv | Mean of aptitude and coding scores | 20% |
| LMS activity | LMS.csv | Assignment completion % | 15% |
| Skills | Skills.csv | Technical skill score | 10% |
| Engagement | Engagement.csv | (Clubs + events) × 10, capped at 100 | 5% |
| Feedback | Feedback.csv | Satisfaction score × 10 | 5% |

**Score = 0.25·Academics + 0.20·Attendance + 0.20·Placement + 0.15·LMS + 0.10·Skills + 0.05·Engagement + 0.05·Feedback**

**Why these weights.** The four heaviest areas are the ones that move with grades and placement outcomes in this data. Engagement and feedback get 5% each because neither is related to anything else here: clubs and events correlate with CGPA at r = 0.00 and with placement at r = −0.03. Technical skill is kept at 10% because in this dataset `technical_skill_score` is an exact copy of `coding_score`, so a higher weight would count coding twice.

**Does it work?** The score was never trained on outcomes, yet placed students average 74.8 against 64.8 for the rest. Ranking students by score separates placed from not placed with an AUC of 0.80. Campus mean is 67.5 (range 39–95).

**Explainable on every profile.** The "Why the score is what it is" chart shows each area's weight times its gap from 100, so a mentor sees which area costs the student the most points.

## 2. Two separate risk flags

A topper can still be unready for placements, so academic and placement risk are never merged. Each risk is a **0–100 index made of factor points**. A factor earns points as the student falls below a healthy level, up to that factor's maximum. The level comes straight from the index, so **the factor percentages shown on a profile are exactly what produced the flag.**

### Academic risk

| Factor | Max points | Full points when |
|---|---|---|
| Internal marks and CGPA | 35 | CGPA 4.5 or lower (0 points at 7.5+) |
| Attendance | 35 | Attendance 60% or lower (0 points at 85%+) |
| Active backlogs | 20 | 3 or more backlogs |
| LMS assignment completion | 10 | 30% or lower completion (0 points at 80%+) |

**High ≥ 45, medium ≥ 28.** Result: 232 high, 214 medium.

### Placement risk

| Factor | Max points | Full points when |
|---|---|---|
| Aptitude and coding tests | 70 | Coding + aptitude average 30 or lower (0 points at 75+) |
| Mock interview practice | 15 | Mock interview score 25 or lower (0 points at 75+) |
| CGPA cut-off | 10 | CGPA 5.0 or lower (0 points at 7.0+, a common recruiter cut-off) |
| Project portfolio | 5 | No projects (0 points at 3+) |

**High ≥ 50, medium ≥ 30.** Result: 251 high, 231 medium. 102 students are high on both tracks.

**Why coding and aptitude carry 70 points.** In this data, every placed student with a recorded coding score (248 of them) averages at least 70 across coding and aptitude, and none of the 690 students below that line were placed. It is the single strongest finding in the dataset.

**Why not just use "attendance below 75% = high risk"?** 558 of the 1,000 students (56%) are under 75%, so that rule flagged most of the campus and could not tell faculty who to help first. The 75% exam-eligibility rule is still raised as its own alert when a student crosses it.

### Worked example: STU004

Success Score **58.6**. Area values: academics 66, attendance 54, LMS 66, placement 50, skills 60, engagement 40, feedback 72.

- **Academic risk: high (index 68).** Attendance explains 53%, backlogs 31%, CGPA 16%.
- **Placement risk: high (index 53).** Aptitude and coding tests explain 80%, mock interview 20%.
- **Suggested follow-up:** mentor call and attendance plan, because attendance is the leading factor on the riskier track.

## 3. Placement probability (machine learning)

A saved scikit-learn pipeline (`backend/placement_model.joblib`) predicts each student's chance of being placed from CGPA, backlogs, attendance, assignment completion, quiz average, technical skill and communication. It reaches AUC 0.97 on these 1,000 students. There is no held-out evaluation and the model was most likely fitted on this same data, so treat it as a strong fit rather than proof of accuracy on a new cohort. The probability is shown next to the placement risk, not blended into it. If the model cannot load, the app shows "model unavailable" instead of a number.

## 4. Segments

K-means (k = 6) on standardised CGPA, attendance, LMS completion, coding score and technical skill. Each cluster is named by where it sits on two axes, academic standing (academics, attendance, LMS) and placement standing (placement, skills), relative to the campus average:

| Segment | Students | Group intervention |
|---|---|---|
| Steady achievers | 206 | Peer-mentor programme |
| High academics, low placement readiness | 179 | Aptitude and coding bootcamp |
| Placement-ready, academically at risk | 119 | Attendance and academics contract |
| Middle of the pack | 234 | Fortnightly mentor check-in |
| Low placement readiness | 129 | Aptitude and coding bootcamp |
| Needs broad support | 133 | Coordinated support plan |

## 5. What is real and what is simulated

Real, from the CSVs: every input value, the score, both risk indices and their explanations, the placement probability and the segments.

Simulated, because the data is anonymised and is a single snapshot with no dates: names, departments and mentors; the split of attendance by subject (it always adds up to the student's real total); the 12-week history behind the trend charts and change alerts; and the starter set of past interventions. These charts carry a "Simulated" tag in the app.
