import type {
  AlertReport,
  AttentionStudent,
  CampusAlert,
  CampusOverview,
  CampusSignalRow,
  DataAreaKey,
  DepartmentRisk,
  ExplainedRisk,
  Intervention,
  InterventionReport,
  InterventionStatus,
  PipelineReport,
  RiskDomain,
  RiskFactor,
  RiskLevel,
  RiskReport,
  ScoreChangeFactor,
  SegmentReport,
  SegmentSummary,
  SignalBand,
  StudentIntervention,
  StudentProfile,
  StudentRow,
  StudentSignal,
  SuggestedAction,
} from "@/lib/types";

/**
 * DEMO DATA: a seeded, simulated campus of 640 invented students.
 *
 * This module stands in for the Python analytics service so every page shows
 * consistent numbers while the backend is being built. Names, scores, risk
 * levels and explanations are illustrative and are not findings about any real
 * campus. Components never import this file directly; they go through the data
 * functions in `lib/*.ts`, which is where the switch to the real API happens.
 */

export const DEMO_TERM = "Odd semester 2026-27";
export const DEMO_WEEK = "Week 12";
export const DEMO_GENERATED_AT = "2026-10-10T09:00:00+05:30";
const WEEKS = 12;
const LAST = WEEKS - 1;
const LOOKBACK = 4;

/* ---------------------------------------------------------------- */
/* Seeded randomness                                                 */
/* ---------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/* ---------------------------------------------------------------- */
/* Campus definition                                                 */
/* ---------------------------------------------------------------- */

const AREAS: { key: DataAreaKey; label: string; weight: number }[] = [
  { key: "academics", label: "Academics", weight: 0.25 },
  { key: "attendance", label: "Attendance", weight: 0.15 },
  { key: "lms", label: "LMS activity", weight: 0.15 },
  { key: "engagement", label: "Engagement", weight: 0.1 },
  { key: "placement", label: "Placement readiness", weight: 0.15 },
  { key: "skills", label: "Skills", weight: 0.1 },
  { key: "feedback", label: "Feedback", weight: 0.1 },
];

type AreaValues = Record<DataAreaKey, number>;

type SegmentDef = {
  segmentId: string;
  name: string;
  description: string;
  share: number;
  centroid: AreaValues;
  /** How much higher each area was eleven weeks ago (positive = declining since). */
  drift: Partial<AreaValues>;
  groupIntervention: SegmentSummary["groupIntervention"];
  tone: SegmentSummary["tone"];
};

const SEGMENTS: SegmentDef[] = [
  {
    segmentId: "steady-achievers",
    name: "Steady achievers",
    description: "Strong across academics and placement prep. Keep them stretched, not just monitored.",
    share: 0.29,
    centroid: { academics: 82, attendance: 88, lms: 84, engagement: 72, placement: 80, skills: 77, feedback: 80 },
    drift: {},
    groupIntervention: { label: "Peer-mentor programme", domain: "academic", detail: "Pair with students in slipping segments as study mentors." },
    tone: "strong",
  },
  {
    segmentId: "toppers-not-placement-ready",
    name: "High academics, low placement readiness",
    description: "Good CGPA and attendance, but weak aptitude, coding and interview practice.",
    share: 0.17,
    centroid: { academics: 84, attendance: 89, lms: 82, engagement: 42, placement: 44, skills: 47, feedback: 74 },
    drift: { placement: -4 },
    groupIntervention: { label: "Aptitude and coding bootcamp", domain: "placement", detail: "Six-week placement track with weekly mock tests." },
    tone: "mixed",
  },
  {
    segmentId: "skilled-low-attendance",
    name: "Strong technical skill, low attendance",
    description: "Ship projects and win hackathons, but miss classes and risk exam eligibility.",
    share: 0.12,
    centroid: { academics: 60, attendance: 50, lms: 54, engagement: 76, placement: 76, skills: 84, feedback: 60 },
    drift: { attendance: 8 },
    groupIntervention: { label: "Attendance contract with mentor", domain: "academic", detail: "Agree a 75% plan; count project work toward lab credit." },
    tone: "mixed",
  },
  {
    segmentId: "quietly-slipping",
    name: "Quietly slipping",
    description: "Were on track at the start of term. LMS activity and attendance have fallen for six weeks.",
    share: 0.18,
    centroid: { academics: 63, attendance: 63, lms: 46, engagement: 46, placement: 58, skills: 57, feedback: 58 },
    drift: { attendance: 15, lms: 24, academics: 8, engagement: 6 },
    groupIntervention: { label: "Early check-in with class mentor", domain: "academic", detail: "One-to-one conversation before mid-semester exams." },
    tone: "watch",
  },
  {
    segmentId: "placement-ready-academic-risk",
    name: "Placement-ready, academically shaky",
    description: "Interview-ready, but backlogs and falling internals could block eligibility.",
    share: 0.15,
    centroid: { academics: 49, attendance: 72, lms: 62, engagement: 66, placement: 77, skills: 71, feedback: 64 },
    drift: { academics: 6 },
    groupIntervention: { label: "Backlog clearance sessions", domain: "academic", detail: "Remedial classes timed before supplementary exams." },
    tone: "watch",
  },
  {
    segmentId: "needs-broad-support",
    name: "Needs broad support",
    description: "Low across most areas. Best served by one coordinated plan, not five separate ones.",
    share: 0.09,
    centroid: { academics: 41, attendance: 54, lms: 38, engagement: 34, placement: 36, skills: 39, feedback: 47 },
    drift: { attendance: 6, lms: 8 },
    groupIntervention: { label: "Coordinated support plan", domain: "academic", detail: "Mentor, counsellor and placement cell agree one weekly plan." },
    tone: "support",
  },
];

const DEPARTMENTS = [
  { name: "CSE", code: "CSE", count: 180, subjects: ["Operating Systems", "DBMS", "Computer Networks", "Compiler Design"] },
  { name: "AI & DS", code: "AID", count: 140, subjects: ["Machine Learning", "Statistics", "Data Mining", "Deep Learning"] },
  { name: "ECE", code: "ECE", count: 120, subjects: ["Signals & Systems", "Analog Circuits", "VLSI Design", "Microprocessors"] },
  { name: "Mechanical", code: "MEC", count: 110, subjects: ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing"] },
  { name: "Civil", code: "CIV", count: 90, subjects: ["Structural Analysis", "Surveying", "Geotechnics", "Concrete Technology"] },
];

const FIRST_NAMES = [
  "Aarav", "Riya", "Karan", "Ananya", "Arjun", "Sneha", "Rohan", "Isha", "Vikram", "Meera", "Aditya", "Kavya", "Rahul", "Pooja",
  "Siddharth", "Nisha", "Varun", "Tanvi", "Harsh", "Diya", "Kabir", "Aditi", "Nikhil", "Shreya", "Pranav", "Ira", "Yash", "Neha",
  "Dev", "Simran", "Aman", "Priya", "Ishaan", "Lavanya", "Manav", "Sakshi", "Om", "Gauri", "Tejas", "Aisha", "Rehan", "Fatima",
  "Joel", "Sara", "Gurpreet", "Harleen", "Abhinav", "Bhavna", "Chirag", "Divya", "Farhan", "Hiba", "Jatin", "Komal",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Mehta", "Gupta", "Kaur", "Das", "Iyer", "Nair", "Reddy", "Patel", "Singh", "Joshi", "Rao", "Menon",
  "Kulkarni", "Chatterjee", "Banerjee", "Pillai", "Desai", "Saxena", "Malhotra", "Bhat", "Ahmed", "Khan", "Fernandes", "Thomas",
  "Gill", "Sandhu", "Mishra", "Pandey", "Chauhan", "Kapoor", "Bose", "Hegde", "Shetty", "Ghosh", "Agarwal", "Sinha",
];

const MENTORS = [
  "Dr. Anita Deshpande", "Prof. Rajesh Kumar", "Dr. Farah Siddiqui", "Prof. Suresh Nair", "Dr. Meenakshi Rao",
  "Prof. Harpreet Bains", "Dr. Thomas Mathew", "Prof. Kavita Joshi",
];

/* ---------------------------------------------------------------- */
/* Scoring rules (mirrors what the backend service will provide)     */
/* ---------------------------------------------------------------- */

const RISK_HIGH = 61;
const RISK_MEDIUM = 50;

function bandFor(value: number): SignalBand {
  if (value >= 70) return 0;
  if (value >= 58) return 1;
  if (value >= 45) return 2;
  return 3;
}

function levelFor(index: number): RiskLevel {
  if (index >= RISK_HIGH) return "high";
  if (index >= RISK_MEDIUM) return "medium";
  return "low";
}

function successScore(v: AreaValues) {
  return AREAS.reduce((sum, a) => sum + a.weight * v[a.key], 0);
}

function academicIndex(v: AreaValues, backlogs: number) {
  const base = 100 - (0.4 * v.academics + 0.35 * v.attendance + 0.25 * v.lms);
  return clamp(base * 1.18 + backlogs * 4 + (v.attendance < 52 ? 6 : 0), 0, 100);
}

function placementIndex(v: AreaValues, semester: number) {
  const base = 100 - (0.45 * v.placement + 0.35 * v.skills + 0.2 * v.engagement);
  const urgency = semester >= 7 ? 5 : semester <= 1 ? -10 : semester === 3 ? -4 : 0;
  return clamp(base * 1.12 + urgency, 0, 100);
}

/* ---------------------------------------------------------------- */
/* Internal student model                                            */
/* ---------------------------------------------------------------- */

type SimStudent = {
  row: StudentRow;
  email: string;
  segment: SegmentDef;
  departmentSubjects: string[];
  values: AreaValues;
  history: Record<DataAreaKey, number[]>;
  scoreHistory: number[];
  backlogs: number;
  aptitudeScore: number;
  mockInterviews: number;
  communicationRating: number;
  clubs: number;
  hackathons: number;
  lmsLogins: number;
  technicalSkills: number;
  feedbackRating: number;
  lowestSubject: { name: string; pct: number };
  subjectAttendance: { subject: string; pct: number }[];
  attendancePctHistory: number[];
  placementProbability: number;
  academic: ExplainedRisk;
  placement: ExplainedRisk;
  academicIndexHistory: number[];
  placementIndexHistory: number[];
  scoreChangeFactors: ScoreChangeFactor[];
  suggestedAction: SuggestedAction & { reason: string };
  interventions: StudentIntervention[];
};

function normaliseFactors(raw: { factor: string; gap: number; evidence: string }[]): RiskFactor[] {
  const kept = raw.filter((f) => f.gap > 0).sort((a, b) => b.gap - a.gap);
  const total = kept.reduce((s, f) => s + f.gap, 0);
  if (total <= 0) return [];
  const significant = kept.filter((f) => f.gap / total >= 0.06);
  const sigTotal = significant.reduce((s, f) => s + f.gap, 0);
  const shares = significant.map((f) => Math.round((f.gap / sigTotal) * 100));
  // Keep shares summing to exactly 100 for display.
  const drift = 100 - shares.reduce((s, x) => s + x, 0);
  if (shares.length > 0) shares[0] += drift;
  return significant.map((f, i) => ({ factor: f.factor, share: shares[i] / 100, evidence: f.evidence }));
}

const ACADEMIC_ACTIONS: Record<string, { id: string; label: (s: SimStudent) => string }> = {
  "Attendance": { id: "mentor-call", label: () => "Mentor call and attendance plan" },
  "Internal marks and CGPA": { id: "remedial-session", label: (s) => `Remedial session: ${s.lowestSubject.name}` },
  "LMS assignment completion": { id: "lms-catch-up", label: () => "LMS catch-up plan with course TA" },
  "Active backlogs": { id: "backlog-clearance", label: () => "Backlog clearance plan" },
};

const PLACEMENT_ACTIONS: Record<string, { id: string; label: string }> = {
  "Aptitude and coding tests": { id: "placement-bootcamp", label: "Enrol in placement-prep bootcamp" },
  "Technical and soft skills": { id: "soft-skills", label: "Soft-skills and communication workshop" },
  "Engagement and projects": { id: "project-referral", label: "Project or internship referral" },
  "Mock interview practice": { id: "mock-interview", label: "Book a mock interview slot" },
};

function buildCampus() {
  const rand = mulberry32(20261010);
  const gauss = () => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  // Separate stream for subject-level detail so adding it never reshuffles the rest of the campus.
  const subjectRand = mulberry32(7310);

  const usedNames = new Set<string>();
  const students: SimStudent[] = [];

  for (const dept of DEPARTMENTS) {
    for (let n = 0; n < dept.count; n++) {
      const semester = [1, 3, 5, 7][Math.floor(rand() * 4)];
      let r = rand();
      let segment = SEGMENTS[SEGMENTS.length - 1];
      for (const s of SEGMENTS) {
        if (r < s.share) {
          segment = s;
          break;
        }
        r -= s.share;
      }

      let name = "";
      do {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      } while (usedNames.has(name));
      usedNames.add(name);

      const values = {} as AreaValues;
      const history = {} as Record<DataAreaKey, number[]>;
      for (const area of AREAS) {
        const final = clamp(segment.centroid[area.key] + gauss() * 9, 6, 98);
        const drift = (segment.drift[area.key] ?? 0) * (0.6 + rand() * 0.8);
        values[area.key] = Math.round(final);
        history[area.key] = Array.from({ length: WEEKS }, (_, w) =>
          w === LAST ? Math.round(final) : Math.round(clamp(final + (drift * (LAST - w)) / LAST + gauss() * 2.2, 4, 99)),
        );
      }

      const cgpa = round1(clamp(4.1 + values.academics * 0.059 + gauss() * 0.18, 4, 9.8));
      const backlogs = values.academics < 45 ? 1 + Math.floor(rand() * 3) : values.academics < 55 ? (rand() < 0.4 ? 1 : 0) : 0;
      const attendancePct = Math.round(clamp(36 + values.attendance * 0.6 + gauss() * 1.5, 35, 99));
      const lmsCompletionPct = Math.round(clamp(24 + values.lms * 0.74, 10, 100));
      const lmsLogins = Math.max(0, Math.round(values.lms / 11 + gauss() * 0.6));
      const clubs = Math.max(0, Math.floor(values.engagement / 28));
      const hackathons = Math.max(0, Math.floor((values.engagement - 30) / 20));
      const aptitudeScore = Math.round(clamp(values.placement * 0.86 + 7 + gauss() * 5, 8, 98));
      const codingScore = Math.round(clamp(values.placement * 0.55 + values.skills * 0.4 + gauss() * 6, 5, 99));
      const mockInterviews = Math.max(0, Math.floor((values.placement - 30) / 18));
      const communicationRating = Math.round(clamp(values.skills / 21 + gauss() * 0.4, 1, 5));
      const technicalSkills = Math.max(1, Math.round(values.skills / 12));
      const feedbackRating = round1(clamp(1.9 + values.feedback * 0.032, 1, 5));
      const subject = pick(dept.subjects);
      const lowestSubject = { name: subject, pct: clamp(attendancePct - 4 - Math.floor(rand() * 10), 20, 99) };
      // Subject-wise attendance: the weakest subject is the one named above, the rest sit around the overall figure.
      const subjectAttendance = dept.subjects.map((name) =>
        name === subject ? { subject: name, pct: lowestSubject.pct } : { subject: name, pct: Math.round(clamp(attendancePct + 1 + subjectRand() * 7, lowestSubject.pct + 1, 99)) },
      );
      const attendancePctHistory = history.attendance.map((v, w) => (w === LAST ? attendancePct : Math.round(clamp(36 + v * 0.6, 35, 99))));

      const scoreHistory = Array.from({ length: WEEKS }, (_, w) => {
        const v = {} as AreaValues;
        for (const a of AREAS) v[a.key] = history[a.key][w];
        return Math.round(successScore(v));
      });

      const academicIndexHistory = Array.from({ length: WEEKS }, (_, w) => {
        const v = {} as AreaValues;
        for (const a of AREAS) v[a.key] = history[a.key][w];
        return academicIndex(v, backlogs);
      });
      const placementIndexHistory = Array.from({ length: WEEKS }, (_, w) => {
        const v = {} as AreaValues;
        for (const a of AREAS) v[a.key] = history[a.key][w];
        return placementIndex(v, semester);
      });

      const aIndex = academicIndexHistory[LAST];
      const pIndex = placementIndexHistory[LAST];
      // Stand-in for the backend placement model: probability of being placed.
      const placementProbability = Math.round((1 / (1 + Math.exp((pIndex - 54) / 7))) * 100) / 100;

      const academic: ExplainedRisk = {
        level: levelFor(aIndex),
        index: Math.round(aIndex),
        factors: normaliseFactors([
          { factor: "Internal marks and CGPA", gap: 0.4 * Math.max(0, 75 - values.academics), evidence: `CGPA ${cgpa.toFixed(1)}, weakest subject ${subject}` },
          { factor: "Attendance", gap: 0.35 * Math.max(0, 80 - values.attendance), evidence: `${attendancePct}% overall, ${lowestSubject.pct}% in ${subject} (75% needed to sit exams)` },
          { factor: "LMS assignment completion", gap: 0.25 * Math.max(0, 75 - values.lms), evidence: `${lmsCompletionPct}% of assignments submitted, ${lmsLogins} logins a week` },
          { factor: "Active backlogs", gap: backlogs * 4, evidence: `${backlogs} active backlog${backlogs === 1 ? "" : "s"}` },
        ]),
      };

      const placement: ExplainedRisk = {
        level: levelFor(pIndex),
        index: Math.round(pIndex),
        factors: normaliseFactors([
          { factor: "Aptitude and coding tests", gap: 0.45 * Math.max(0, 75 - values.placement), evidence: `Aptitude ${aptitudeScore}/100, coding ${codingScore}/100` },
          { factor: "Technical and soft skills", gap: 0.35 * Math.max(0, 72 - values.skills), evidence: `${technicalSkills} verified skills, communication rated ${communicationRating}/5` },
          { factor: "Engagement and projects", gap: 0.2 * Math.max(0, 65 - values.engagement), evidence: `${clubs} club${clubs === 1 ? "" : "s"}, ${hackathons} hackathon${hackathons === 1 ? "" : "s"} this year` },
          { factor: "Mock interview practice", gap: mockInterviews === 0 && semester >= 5 ? 5 : 0, evidence: "No mock interviews completed" },
        ]),
      };

      // What moved the score over the lookback window.
      const from = LAST - LOOKBACK;
      const deltas = AREAS.map((a) => ({
        key: a.key,
        label: a.label,
        points: a.weight * (history[a.key][LAST] - history[a.key][from]),
      })).filter((d) => Math.abs(d.points) >= 0.15);
      const negTotal = deltas.filter((d) => d.points < 0).reduce((s, d) => s + Math.abs(d.points), 0);
      const posTotal = deltas.filter((d) => d.points > 0).reduce((s, d) => s + d.points, 0);
      const scoreChangeFactors: ScoreChangeFactor[] = deltas
        .map((d) => ({
          ...d,
          points: round1(d.points),
          share: d.points < 0 ? Math.abs(d.points) / negTotal : d.points / posTotal,
        }))
        .sort((a, b) => a.points - b.points);

      const year = { 7: 22, 5: 23, 3: 24, 1: 25 }[semester as 1 | 3 | 5 | 7];
      const studentId = `${dept.code}-${year}-${String(n + 1).padStart(3, "0")}`;
      const [first, last] = name.toLowerCase().split(" ");

      const sim: SimStudent = {
        row: {
          studentId,
          name,
          department: dept.name,
          semester,
          mentor: MENTORS[(n + dept.code.length) % MENTORS.length],
          successScore: scoreHistory[LAST],
          scoreChange: scoreHistory[LAST] - scoreHistory[from],
          academicRisk: academic.level,
          placementRisk: placement.level,
          segmentId: segment.segmentId,
          cgpa,
          attendancePct,
          lmsCompletionPct,
          codingScore,
          placementProbability,
        },
        email: `${first}.${last}@campus.demo`,
        segment,
        departmentSubjects: dept.subjects,
        values,
        history,
        scoreHistory,
        backlogs,
        aptitudeScore,
        mockInterviews,
        communicationRating,
        clubs,
        hackathons,
        lmsLogins,
        technicalSkills,
        feedbackRating,
        lowestSubject,
        subjectAttendance,
        attendancePctHistory,
        placementProbability,
        academic,
        placement,
        academicIndexHistory,
        placementIndexHistory,
        scoreChangeFactors,
        suggestedAction: { id: "monitor", label: "Keep monitoring", domain: "academic", reason: "No risk flags this week" },
        interventions: [],
      };

      // Suggested follow-up, matched to the leading factor of the riskier track.
      const riskierDomain: RiskDomain = academic.index >= placement.index ? "academic" : "placement";
      const lead = (riskierDomain === "academic" ? academic : placement).factors[0];
      if (lead && (academic.level !== "low" || placement.level !== "low")) {
        const pct = Math.round(lead.share * 100);
        if (riskierDomain === "academic") {
          const action = ACADEMIC_ACTIONS[lead.factor];
          sim.suggestedAction = { id: action.id, label: action.label(sim), domain: "academic", reason: `${lead.factor} explains ${pct}% of academic risk` };
        } else {
          const action = PLACEMENT_ACTIONS[lead.factor];
          sim.suggestedAction = { id: action.id, label: action.label, domain: "placement", reason: `${lead.factor} explains ${pct}% of placement risk` };
        }
      }

      students.push(sim);
    }
  }

  // Interventions: a share of flagged students already have one assigned.
  let interventionSeq = 1;
  for (const s of students) {
    const flagged = s.academic.level === "high" || s.placement.level === "high";
    if (!flagged || s.suggestedAction.id === "monitor") continue;
    if (rand() > 0.3) continue;
    const startIdx = 4 + Math.floor(rand() * 6);
    const gained = s.scoreHistory[LAST] - s.scoreHistory[startIdx];
    let status: InterventionStatus = rand() < 0.45 ? "in-progress" : "assigned";
    if (startIdx <= 7 && (gained >= 1 || rand() < 0.12)) status = "completed";
    s.interventions.push({
      interventionId: `INT-${String(interventionSeq++).padStart(3, "0")}`,
      label: s.suggestedAction.label,
      domain: s.suggestedAction.domain,
      status,
      owner: s.row.mentor,
      startedWeek: `W${startIdx + 1}`,
    });
  }

  return students;
}

/* ---------------------------------------------------------------- */
/* Memoised campus and derived payloads                              */
/* ---------------------------------------------------------------- */

let campusCache: SimStudent[] | null = null;
function campus() {
  campusCache ??= buildCampus();
  return campusCache;
}

const levelRank: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };

/** Attention queue: anyone with a high flag, most urgent first. */
function attentionQueue() {
  return campus()
    .filter((s) => s.academic.level === "high" || s.placement.level === "high")
    .sort((a, b) => {
      const pa = levelRank[a.academic.level] + levelRank[a.placement.level];
      const pb = levelRank[b.academic.level] + levelRank[b.placement.level];
      return pb - pa || a.row.successScore - b.row.successScore;
    });
}

const ACADEMIC_AREAS: DataAreaKey[] = ["academics", "attendance", "lms"];

/**
 * Early-warning alerts: rules that fire when something changes, so faculty hear about
 * it the week it happens. The backend will own these rules; this mirrors them.
 */
function alertsFor(s: SimStudent): CampusAlert[] {
  const out: CampusAlert[] = [];
  const base = { studentId: s.row.studentId, studentName: s.row.name, department: s.row.department };
  const recent = Array.from({ length: LOOKBACK }, (_, i) => LAST - LOOKBACK + 1 + i);

  const attWeek = recent.find((w) => s.attendancePctHistory[w - 1] >= 75 && s.attendancePctHistory[w] < 75);
  if (attWeek !== undefined) {
    out.push({
      ...base,
      alertId: `${s.row.studentId}-att`,
      kind: "attendance-threshold",
      severity: "high",
      domain: "academic",
      title: "Attendance fell below 75%",
      detail: `${s.attendancePctHistory[attWeek - 1]}% to ${s.row.attendancePct}%. Lowest in ${s.lowestSubject.name} at ${s.lowestSubject.pct}%; below 75% blocks exam eligibility.`,
      week: `W${attWeek + 1}`,
    });
  }

  for (const [domain, risk, history] of [
    ["academic", s.academic, s.academicIndexHistory],
    ["placement", s.placement, s.placementIndexHistory],
  ] as const) {
    if (risk.level !== "high") continue;
    const w = recent.find((x) => history[x - 1] < RISK_HIGH && history[x] >= RISK_HIGH);
    if (w === undefined) continue;
    const lead = risk.factors[0];
    out.push({
      ...base,
      alertId: `${s.row.studentId}-${domain}-high`,
      kind: "new-high-risk",
      severity: "high",
      domain,
      title: `Now high ${domain} risk`,
      detail: lead ? `${lead.factor} explains ${Math.round(lead.share * 100)}%: ${lead.evidence}.` : "Several small gaps combined.",
      week: `W${w + 1}`,
    });
  }

  const drop = s.row.scoreChange;
  if (drop <= -5) {
    const worst = s.scoreChangeFactors.find((f) => f.points < 0);
    out.push({
      ...base,
      alertId: `${s.row.studentId}-drop`,
      kind: "score-drop",
      severity: drop <= -8 ? "high" : "medium",
      domain: worst && !ACADEMIC_AREAS.includes(worst.key) ? "placement" : "academic",
      title: `Success score down ${Math.abs(drop)} points in 4 weeks`,
      detail: worst ? `Mostly from ${worst.label} (${Math.round(worst.share * 100)}% of the drop).` : "Spread across several areas.",
      week: `W${LAST + 1}`,
    });
  }

  if (s.history.lms[LAST - LOOKBACK] - s.history.lms[LAST] >= 15) {
    out.push({
      ...base,
      alertId: `${s.row.studentId}-lms`,
      kind: "lms-drop",
      severity: "medium",
      domain: "academic",
      title: "LMS activity dropped sharply",
      detail: `${s.row.lmsCompletionPct}% of assignments submitted, ${s.lmsLogins} logins a week.`,
      week: `W${LAST + 1}`,
    });
  }

  if (s.row.semester >= 7 && s.placementProbability < 0.25) {
    out.push({
      ...base,
      alertId: `${s.row.studentId}-placement`,
      kind: "placement-prediction",
      severity: "high",
      domain: "placement",
      title: "Predicted to miss placement",
      detail: `${Math.round(s.placementProbability * 100)}% chance of being placed. Main gap: ${s.placement.factors[0]?.factor.toLowerCase() ?? "placement tests"}.`,
      week: `W${LAST + 1}`,
    });
  }

  return out;
}

let alertCache: CampusAlert[] | null = null;
function allAlerts() {
  const rank = { high: 0, medium: 1, low: 2 };
  alertCache ??= campus()
    .flatMap(alertsFor)
    .sort((a, b) => Number(b.week.slice(1)) - Number(a.week.slice(1)) || rank[a.severity] - rank[b.severity]);
  return alertCache;
}

export function getDemoAlerts(): AlertReport {
  return { generatedAt: DEMO_GENERATED_AT, currentWeek: DEMO_WEEK, alerts: allAlerts() };
}

function toAttention(s: SimStudent): AttentionStudent {
  return {
    studentId: s.row.studentId,
    name: s.row.name,
    department: s.row.department,
    semester: s.row.semester,
    successScore: s.row.successScore,
    academicRisk: { level: s.academic.level, drivers: s.academic.level === "low" ? [] : s.academic.factors.slice(0, 2).map((f) => f.evidence) },
    placementRisk: { level: s.placement.level, drivers: s.placement.level === "low" ? [] : s.placement.factors.slice(0, 2).map((f) => f.evidence) },
    suggestedAction: { id: s.suggestedAction.id, label: s.suggestedAction.label, domain: s.suggestedAction.domain },
  };
}

function segmentSummaries(): SegmentSummary[] {
  const all = campus();
  return SEGMENTS.map((seg) => {
    const members = all.filter((s) => s.segment === seg);
    const avg = (fn: (s: SimStudent) => number) => members.reduce((sum, s) => sum + fn(s), 0) / Math.max(1, members.length);
    return {
      segmentId: seg.segmentId,
      name: seg.name,
      description: seg.description,
      students: members.length,
      averageScore: round1(avg((s) => s.row.successScore)),
      profile: AREAS.map((a) => ({ key: a.key, label: a.label, value: Math.round(avg((s) => s.values[a.key])) })),
      academicHigh: members.filter((s) => s.academic.level === "high").length,
      placementHigh: members.filter((s) => s.placement.level === "high").length,
      groupIntervention: seg.groupIntervention,
      tone: seg.tone,
    };
  });
}

function weeklyRisk() {
  const all = campus();
  return Array.from({ length: WEEKS }, (_, w) => ({
    week: `W${w + 1}`,
    academicHigh: all.filter((s) => s.academicIndexHistory[w] >= RISK_HIGH).length,
    placementHigh: all.filter((s) => s.placementIndexHistory[w] >= RISK_HIGH).length,
  }));
}

function departmentRisk(): DepartmentRisk[] {
  const all = campus();
  return DEPARTMENTS.map((d) => {
    const members = all.filter((s) => s.row.department === d.name);
    return {
      department: d.name,
      students: members.length,
      academicHigh: members.filter((s) => s.academic.level === "high").length,
      placementHigh: members.filter((s) => s.placement.level === "high").length,
    };
  });
}

function allInterventions(): Intervention[] {
  return campus().flatMap((s) =>
    s.interventions.map((i) => {
      const startIdx = Number(i.startedWeek.slice(1)) - 1;
      return {
        interventionId: i.interventionId,
        studentId: s.row.studentId,
        studentName: s.row.name,
        department: s.row.department,
        label: i.label,
        domain: i.domain,
        status: i.status,
        owner: i.owner,
        startedWeek: i.startedWeek,
        scoreBefore: s.scoreHistory[startIdx],
        scoreNow: s.row.successScore,
        reason: s.suggestedAction.reason,
      };
    }),
  );
}

export function getDemoOverview(): CampusOverview {
  const all = campus();
  const count = (fn: (s: SimStudent) => boolean) => all.filter(fn).length;
  const weeklyScore = Array.from({ length: WEEKS }, (_, w) => round1(all.reduce((sum, s) => sum + s.scoreHistory[w], 0) / all.length));
  const interventions = allInterventions();

  const signalChart: CampusSignalRow[] = AREAS.map((a) => ({
    key: a.key,
    label: a.label,
    shares: Array.from({ length: WEEKS }, (_, w) => round1((all.filter((s) => bandFor(s.history[a.key][w]) >= 2).length / all.length) * 100)),
    flaggedNow: all.filter((s) => bandFor(s.values[a.key]) >= 2).length,
  }));

  const bands = [
    { label: "0-39", min: 0, max: 39 },
    { label: "40-54", min: 40, max: 54 },
    { label: "55-69", min: 55, max: 69 },
    { label: "70-84", min: 70, max: 84 },
    { label: "85-100", min: 85, max: 100 },
  ];

  const followUpCounts = new Map<string, { label: string; domain: RiskDomain; students: number }>();
  for (const s of attentionQueue()) {
    const key = s.suggestedAction.id;
    const entry = followUpCounts.get(key);
    const label = key === "remedial-session" ? "Remedial subject sessions" : s.suggestedAction.label;
    if (entry) entry.students += 1;
    else followUpCounts.set(key, { label, domain: s.suggestedAction.domain, students: 1 });
  }
  const followUpDescriptions: Record<string, string> = {
    "mentor-call": "Students with low or falling attendance.",
    "remedial-session": "Students whose internal marks are the main concern.",
    "lms-catch-up": "Students who have stopped submitting LMS work.",
    "backlog-clearance": "Students carrying active backlogs.",
    "placement-bootcamp": "Low aptitude or coding test scores.",
    "soft-skills": "Low communication or skills ratings.",
    "project-referral": "Few projects, clubs or hackathons on record.",
    "mock-interview": "Final-years with no mock interviews yet.",
  };

  return {
    generatedAt: DEMO_GENERATED_AT,
    term: DEMO_TERM,
    currentWeek: DEMO_WEEK,
    summary: {
      studentsTracked: all.length,
      averageSuccessScore: weeklyScore[LAST],
      averageSuccessScoreChange: round1(weeklyScore[LAST] - weeklyScore[LAST - 1]),
      academicRisk: { high: count((s) => s.academic.level === "high"), medium: count((s) => s.academic.level === "medium") },
      placementRisk: { high: count((s) => s.placement.level === "high"), medium: count((s) => s.placement.level === "medium") },
      openInterventions: interventions.filter((i) => i.status === "assigned" || i.status === "in-progress").length,
    },
    weeklyRisk: weeklyRisk(),
    departmentRisk: departmentRisk(),
    scoreDistribution: bands.map((b) => ({ ...b, students: count((s) => s.row.successScore >= b.min && s.row.successScore <= b.max) })),
    studentsNeedingAttention: attentionQueue().slice(0, 6).map(toAttention),
    followUpActions: [...followUpCounts.entries()]
      .map(([actionId, v]) => ({ actionId, label: v.label, description: followUpDescriptions[actionId] ?? "", domain: v.domain, students: v.students }))
      .sort((a, b) => b.students - a.students),
    dataAreas: [
      { key: "academics", label: "Academics", description: "CGPA, internals, backlogs", records: all.length * 6 },
      { key: "attendance", label: "Attendance", description: "Weekly, subject-wise", records: all.length * WEEKS * 4 },
      { key: "lms", label: "LMS activity", description: "Logins, assignments", records: all.length * WEEKS * 3 },
      { key: "engagement", label: "Engagement", description: "Clubs, events, hackathons", records: 2115 },
      { key: "placement", label: "Placement readiness", description: "Aptitude, coding, mock interviews", records: all.length * 3 },
      { key: "skills", label: "Skills", description: "Technical and soft skills", records: 3204 },
      { key: "feedback", label: "Feedback", description: "Course and mentor feedback", records: 1190 },
    ],
    signalChart,
    weeklyScore,
    segments: segmentSummaries(),
  };
}

export function getDemoRoster(): StudentRow[] {
  return campus().map((s) => s.row);
}

export function getDemoProfile(studentId: string): StudentProfile | null {
  const s = campus().find((x) => x.row.studentId === studentId);
  if (!s) return null;
  const queue = attentionQueue();
  const at = queue.indexOf(s);
  const signals: StudentSignal[] = AREAS.map((a) => ({
    key: a.key,
    label: a.label,
    value: s.values[a.key],
    weight: a.weight,
    band: bandFor(s.values[a.key]),
    history: s.history[a.key].map(bandFor),
    evidence: {
      academics: [`CGPA ${s.row.cgpa.toFixed(1)}`, `${s.backlogs} active backlog${s.backlogs === 1 ? "" : "s"}`],
      attendance: [`${s.row.attendancePct}% overall`, `${s.lowestSubject.pct}% in ${s.lowestSubject.name}`],
      lms: [`${s.row.lmsCompletionPct}% assignments submitted`, `${s.lmsLogins} logins a week`],
      engagement: [`${s.clubs} club${s.clubs === 1 ? "" : "s"}`, `${s.hackathons} hackathon${s.hackathons === 1 ? "" : "s"}`],
      placement: [`Aptitude ${s.aptitudeScore}/100`, `Coding ${s.row.codingScore}/100`, `${s.mockInterviews} mock interview${s.mockInterviews === 1 ? "" : "s"}`],
      skills: [`${s.technicalSkills} verified skills`, `Communication ${s.communicationRating}/5`],
      feedback: [`Mentor rating ${s.feedbackRating.toFixed(1)}/5`],
    }[a.key],
  }));

  return {
    ...s.row,
    email: s.email,
    backlogs: s.backlogs,
    aptitudeScore: s.aptitudeScore,
    mockInterviews: s.mockInterviews,
    communicationRating: s.communicationRating,
    clubs: s.clubs,
    hackathons: s.hackathons,
    scoreHistory: s.scoreHistory,
    signals,
    academic: s.academic,
    placement: s.placement,
    scoreChangeFactors: s.scoreChangeFactors,
    suggestedAction: s.suggestedAction,
    interventions: s.interventions,
    subjectAttendance: s.subjectAttendance,
    alerts: allAlerts().filter((a) => a.studentId === s.row.studentId),
    previousFlaggedId: at > 0 ? queue[at - 1].row.studentId : null,
    nextFlaggedId: at >= 0 && at < queue.length - 1 ? queue[at + 1].row.studentId : at < 0 && queue.length ? queue[0].row.studentId : null,
  };
}

export function getDemoRiskReport(): RiskReport {
  const all = campus();
  const levels: RiskLevel[] = ["high", "medium", "low"];
  const matrix = levels.flatMap((academic) =>
    levels.map((placement) => ({
      academic,
      placement,
      students: all.filter((s) => s.academic.level === academic && s.placement.level === placement).length,
    })),
  );

  const driverMap = new Map<string, { domain: RiskDomain; students: number; shareSum: number; seen: number }>();
  for (const s of all) {
    for (const [domain, risk] of [["academic", s.academic], ["placement", s.placement]] as const) {
      if (risk.level === "low") continue;
      risk.factors.forEach((f, i) => {
        const entry = driverMap.get(f.factor) ?? { domain, students: 0, shareSum: 0, seen: 0 };
        if (i === 0) entry.students += 1;
        entry.shareSum += f.share;
        entry.seen += 1;
        driverMap.set(f.factor, entry);
      });
    }
  }

  const queue = attentionQueue();
  return {
    generatedAt: DEMO_GENERATED_AT,
    currentWeek: DEMO_WEEK,
    matrix,
    drivers: [...driverMap.entries()]
      .map(([factor, v]) => ({ factor, domain: v.domain, students: v.students, averageShare: v.shareSum / Math.max(1, v.seen) }))
      .sort((a, b) => b.students - a.students),
    departmentRisk: departmentRisk(),
    weeklyRisk: weeklyRisk(),
    newlyFlagged: queue
      .filter(
        (s) =>
          (s.academic.level === "high" && s.academicIndexHistory[LAST - LOOKBACK] < RISK_HIGH) ||
          (s.placement.level === "high" && s.placementIndexHistory[LAST - LOOKBACK] < RISK_HIGH),
      )
      .map((s) => s.row),
    flagged: queue.map((s) => s.row),
  };
}

export function getDemoSegmentReport(): SegmentReport {
  return {
    generatedAt: DEMO_GENERATED_AT,
    method: "k-means on the seven standardised data-area scores (k = 6, chosen by silhouette score)",
    segments: segmentSummaries(),
    points: campus().map((s) => ({
      studentId: s.row.studentId,
      name: s.row.name,
      segmentId: s.segment.segmentId,
      academicReadiness: Math.round(100 - s.academic.index),
      placementReadiness: Math.round(100 - s.placement.index),
    })),
  };
}

export function getDemoInterventionReport(): InterventionReport {
  const interventions = allInterventions();
  const suggested: Intervention[] = attentionQueue()
    .filter((s) => s.interventions.length === 0)
    .map((s, i) => ({
      interventionId: `SUG-${String(i + 1).padStart(3, "0")}`,
      studentId: s.row.studentId,
      studentName: s.row.name,
      department: s.row.department,
      label: s.suggestedAction.label,
      domain: s.suggestedAction.domain,
      status: "suggested" as const,
      owner: s.row.mentor,
      startedWeek: DEMO_WEEK.replace("Week ", "W"),
      scoreBefore: s.row.successScore,
      scoreNow: s.row.successScore,
      reason: s.suggestedAction.reason,
    }));

  const completed = interventions.filter((i) => i.status === "completed");
  const outcomeMap = new Map<string, { domain: RiskDomain; completed: number; improved: number; gain: number }>();
  for (const i of completed) {
    const key = i.label.startsWith("Remedial session") ? "Remedial subject sessions" : i.label;
    const e = outcomeMap.get(key) ?? { domain: i.domain, completed: 0, improved: 0, gain: 0 };
    e.completed += 1;
    if (i.scoreNow > i.scoreBefore) e.improved += 1;
    e.gain += i.scoreNow - i.scoreBefore;
    outcomeMap.set(key, e);
  }

  return {
    generatedAt: DEMO_GENERATED_AT,
    currentWeek: DEMO_WEEK,
    interventions: [...suggested, ...interventions],
    outcomes: [...outcomeMap.entries()]
      .map(([label, e]) => ({ label, domain: e.domain, completed: e.completed, improved: e.improved, averageGain: round1(e.gain / e.completed) }))
      .sort((a, b) => b.completed - a.completed),
  };
}

export function getDemoPipeline(): PipelineReport {
  const n = campus().length;
  return {
    generatedAt: DEMO_GENERATED_AT,
    studentsUnified: n,
    sources: [
      { key: "academics", label: "Academics", file: "Academic.csv", fields: ["student_id", "cgpa", "backlogs", "semester"], rows: n * 6, matchedStudents: n, missingValues: 14, duplicatesRemoved: 3, refreshed: "2026-10-09" },
      { key: "attendance", label: "Attendance", file: "Attendance.csv", fields: ["student_id", "attendance_pct", "classes_attended"], rows: n * WEEKS * 4, matchedStudents: n, missingValues: 212, duplicatesRemoved: 41, refreshed: "2026-10-10" },
      { key: "lms", label: "LMS activity", file: "LMS.csv", fields: ["student_id", "assignment_completion_pct", "lms_logins_30d", "quiz_avg"], rows: n * WEEKS * 3, matchedStudents: 637, missingValues: 96, duplicatesRemoved: 18, refreshed: "2026-10-10" },
      { key: "engagement", label: "Engagement", file: "Engagement.csv", fields: ["student_id", "clubs_participation_count", "events_attended_count"], rows: 2115, matchedStudents: 588, missingValues: 7, duplicatesRemoved: 22, refreshed: "2026-10-08" },
      { key: "placement", label: "Placement readiness", file: "Placement.csv", fields: ["student_id", "aptitude_score", "coding_score", "mock_interview_score", "placement_outcome"], rows: n * 3, matchedStudents: 626, missingValues: 31, duplicatesRemoved: 0, refreshed: "2026-10-07" },
      { key: "skills", label: "Skills", file: "Skills.csv", fields: ["student_id", "technical_skill_score", "communication_score", "projects_count", "certifications_count"], rows: 3204, matchedStudents: 619, missingValues: 12, duplicatesRemoved: 9, refreshed: "2026-10-06" },
      { key: "feedback", label: "Feedback", file: "Feedback.csv", fields: ["student_id", "satisfaction_score", "support_need_category"], rows: 1190, matchedStudents: 571, missingValues: 18, duplicatesRemoved: 4, refreshed: "2026-10-09" },
    ],
    steps: [
      { title: "Ingest", detail: "Seven CSV exports are loaded and their column names mapped to one schema." },
      { title: "Clean", detail: "Duplicates are removed, IDs normalised and missing values imputed per department." },
      { title: "Join", detail: "Every source is joined on student_id into one record per student." },
      { title: "Score", detail: "Area scores are standardised and weighted into the 0-100 Student Success Score." },
      { title: "Flag and explain", detail: "Academic and placement risk are scored separately, with each factor's share." },
      { title: "Segment", detail: "Students are clustered on their area profile for group interventions." },
    ],
    weights: AREAS.map((a) => ({ key: a.key, label: a.label, weight: a.weight })),
  };
}
