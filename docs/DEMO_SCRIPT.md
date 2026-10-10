# Demo script (about 3 minutes)

Start everything with `python backend/main.py --frontend`, open http://127.0.0.1:3000 and sign in to the demo. Check the top bar says **Live data**.

| # | Page | What to show | What to say |
|---|---|---|---|
| 1 | Data sources | The seven files joining into one record; "What joining the sources revealed" | "Seven exports, 1,000 students, every ID matches. Joining them showed two Skills columns are copies of Placement columns, so we don't count them twice." |
| 2 | Overview | Stat tiles, then "What the combined data shows" | "One score per student, two risk tracks. Biggest finding: every placed student averages 70+ on coding and aptitude, and 203 of our CGPA-8+ students are below that line." |
| 3 | Overview | "Who needs help first?" and click one student | "Ranked by urgency, with the reason in plain language." |
| 4 | Student profile | "In short" line, both risk explainers, score breakdown, placement prediction | "Every flag shows which factors caused it and by how much. Here attendance explains 53% of the academic risk, so the suggested step is a mentor call." |
| 5 | Student profile | Click **Assign follow-up**, then open Interventions and reload | "It's saved. The board tracks it from suggested to completed." |
| 6 | Risks | Click a cell in the academic × placement grid | "Academic and placement risk are separate: a topper can still be unready for placements." |
| 7 | Segments | "High academics, low placement readiness" on the readiness map; click **Plan for all** | "One bootcamp for 179 students instead of 179 separate conversations." |
| 8 | Alerts | Mark one alert handled | "Early-warning alerts for attendance crossing 75%, new high risk and final-years predicted to miss placement." |

**Be upfront about one thing.** The data is a single snapshot, so names, subject splits and the weekly history are simulated around the real values. Those charts carry a "Simulated" tag. Every score, risk, prediction and segment comes from the real data.

Scoring details for questions: [SUCCESS_SCORE.md](SUCCESS_SCORE.md).
