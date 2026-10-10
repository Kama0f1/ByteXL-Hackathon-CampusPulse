/**
 * Shared data contracts between the CampusPulse frontend and the analytics backend.
 *
 * The frontend only displays these values. Success scores, risk levels, explanations
 * ("drivers") and suggested actions are produced by the backend analytics service;
 * the frontend never recalculates them.
 */

/** Where a payload came from. "demo" payloads must be labelled as demo data in the UI. */
export type DataOrigin = "demo" | "api";

export type DataResult<T> = {
  origin: DataOrigin;
  data: T;
};

export type RiskLevel = "high" | "medium" | "low";

/** CampusPulse keeps academic and placement risk separate everywhere. */
export type RiskDomain = "academic" | "placement";

/** The seven student-data areas combined into one student view. */
export type DataAreaKey =
  | "academics"
  | "attendance"
  | "lms"
  | "placement"
  | "skills"
  | "engagement"
  | "feedback";

export type RiskAssessment = {
  level: RiskLevel;
  /** Plain-language reasons from the backend explanation step, most important first. */
  drivers: string[];
};

export type RiskCounts = {
  high: number;
  medium: number;
};

export type SuggestedAction = {
  id: string;
  label: string;
  domain: RiskDomain;
};

export type AttentionStudent = {
  studentId: string;
  name: string;
  department: string;
  semester: number;
  /** Student Success Score, 0–100, computed by the backend. */
  successScore: number;
  academicRisk: RiskAssessment;
  placementRisk: RiskAssessment;
  suggestedAction: SuggestedAction;
};

export type OverviewSummary = {
  studentsTracked: number;
  averageSuccessScore: number;
  /** Change in the average score since the previous week, in score points. */
  averageSuccessScoreChange: number;
  academicRisk: RiskCounts;
  placementRisk: RiskCounts;
  openInterventions: number;
};

/** Students flagged as high risk at the end of each teaching week. */
export type WeeklyRiskPoint = {
  week: string;
  academicHigh: number;
  placementHigh: number;
};

export type DepartmentRisk = {
  department: string;
  students: number;
  academicHigh: number;
  placementHigh: number;
};

export type ScoreBand = {
  label: string;
  min: number;
  max: number;
  students: number;
};

export type FollowUpActionSummary = {
  actionId: string;
  label: string;
  description: string;
  domain: RiskDomain;
  students: number;
};

export type DataAreaStatus = {
  key: DataAreaKey;
  label: string;
  description: string;
  records: number;
};

/** Early-warning band for one data area in one week: 0 on track, 3 urgent. */
export type SignalBand = 0 | 1 | 2 | 3;

/** One row of the campus signal heatmap. */
export type CampusSignalRow = {
  key: DataAreaKey;
  label: string;
  /** Percentage of students flagged (band 2 or 3) in this area each week, oldest first. */
  shares: number[];
  /** Students at band 2 or 3 in the latest week. */
  flaggedNow: number;
};

/** Payload for the overview dashboard. Proposed backend endpoint: GET /api/overview. */
export type CampusOverview = {
  generatedAt: string;
  term: string;
  currentWeek: string;
  summary: OverviewSummary;
  weeklyRisk: WeeklyRiskPoint[];
  departmentRisk: DepartmentRisk[];
  scoreDistribution: ScoreBand[];
  studentsNeedingAttention: AttentionStudent[];
  followUpActions: FollowUpActionSummary[];
  dataAreas: DataAreaStatus[];
  /** Campus early-warning chart: one row per data area, weekly bands. */
  signalChart: CampusSignalRow[];
  /** Average success score per week, oldest first. */
  weeklyScore: number[];
  segments: SegmentSummary[];
};

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

/** Lean row for the student roster table. Proposed endpoint: GET /api/students. */
export type StudentRow = {
  studentId: string;
  name: string;
  department: string;
  semester: number;
  mentor: string;
  successScore: number;
  /** Change in score over the last four weeks, in points. */
  scoreChange: number;
  academicRisk: RiskLevel;
  placementRisk: RiskLevel;
  segmentId: string;
  cgpa: number;
  attendancePct: number;
  lmsCompletionPct: number;
  codingScore: number;
  /** Predicted probability of being placed, 0–1, from the backend placement model. */
  placementProbability: number;
};

/** One data area's standing for a student, with weekly history. */
export type StudentSignal = {
  key: DataAreaKey;
  label: string;
  /** Normalised 0–100 area score from the backend. */
  value: number;
  /** Weight of this area in the Student Success Score (weights sum to 1). */
  weight: number;
  band: SignalBand;
  /** Weekly bands, oldest first. */
  history: SignalBand[];
  /** Raw indicators behind the area score, in plain language. */
  evidence: string[];
};

/** One factor's share of a risk flag (explainable score). Shares in a list sum to 1. */
export type RiskFactor = {
  factor: string;
  share: number;
  evidence: string;
};

export type ExplainedRisk = {
  level: RiskLevel;
  /** 0–100 risk index from the backend; higher is riskier. */
  index: number;
  factors: RiskFactor[];
};

/** What moved the score over the last four weeks. Shares sum to 1 within each direction. */
export type ScoreChangeFactor = {
  key: DataAreaKey;
  label: string;
  /** Signed points this area added to or removed from the score. */
  points: number;
  share: number;
};

export type InterventionStatus = "suggested" | "assigned" | "in-progress" | "completed";

export type StudentIntervention = {
  interventionId: string;
  label: string;
  domain: RiskDomain;
  status: InterventionStatus;
  owner: string;
  startedWeek: string;
};

/** Full student profile. Proposed endpoint: GET /api/students/{id}. */
export type StudentProfile = StudentRow & {
  email: string;
  backlogs: number;
  aptitudeScore: number;
  mockInterviews: number;
  communicationRating: number;
  clubs: number;
  hackathons: number;
  scoreHistory: number[];
  signals: StudentSignal[];
  academic: ExplainedRisk;
  placement: ExplainedRisk;
  scoreChangeFactors: ScoreChangeFactor[];
  suggestedAction: SuggestedAction & { reason: string };
  interventions: StudentIntervention[];
  /** Attendance per subject this term (the brief asks for overall and subject-wise). */
  subjectAttendance: { subject: string; pct: number }[];
  alerts: CampusAlert[];
  /** Neighbouring students in the attention queue, for quick navigation. */
  previousFlaggedId: string | null;
  nextFlaggedId: string | null;
};

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export type AlertKind = "attendance-threshold" | "new-high-risk" | "score-drop" | "lms-drop" | "placement-prediction";

/** Something changed that faculty should act on. Proposed endpoint: GET /api/alerts. */
export type CampusAlert = {
  alertId: string;
  studentId: string;
  studentName: string;
  department: string;
  kind: AlertKind;
  severity: Exclude<RiskLevel, "low">;
  domain: RiskDomain;
  title: string;
  detail: string;
  /** Teaching week the alert fired, e.g. "W12". */
  week: string;
};

export type AlertReport = {
  generatedAt: string;
  currentWeek: string;
  alerts: CampusAlert[];
};

/* ------------------------------------------------------------------ */
/* Risks                                                               */
/* ------------------------------------------------------------------ */

export type RiskDriverSummary = {
  factor: string;
  domain: RiskDomain;
  /** Students for whom this is the leading factor. */
  students: number;
  /** Average share of the risk index it explains when present. */
  averageShare: number;
};

/** Students per academic × placement risk level combination. */
export type RiskMatrixCell = {
  academic: RiskLevel;
  placement: RiskLevel;
  students: number;
};

/** Proposed endpoint: GET /api/risks. */
export type RiskReport = {
  generatedAt: string;
  currentWeek: string;
  matrix: RiskMatrixCell[];
  drivers: RiskDriverSummary[];
  departmentRisk: DepartmentRisk[];
  weeklyRisk: WeeklyRiskPoint[];
  /** Students whose risk level rose in the last four weeks. */
  newlyFlagged: StudentRow[];
  flagged: StudentRow[];
};

/* ------------------------------------------------------------------ */
/* Segments                                                            */
/* ------------------------------------------------------------------ */

/** A student cluster for group interventions. Proposed endpoint: GET /api/segments. */
export type SegmentSummary = {
  segmentId: string;
  name: string;
  description: string;
  students: number;
  averageScore: number;
  /** Cluster centre on each data area, 0–100. */
  profile: { key: DataAreaKey; label: string; value: number }[];
  academicHigh: number;
  placementHigh: number;
  groupIntervention: { label: string; domain: RiskDomain; detail: string };
  tone: "strong" | "mixed" | "watch" | "support";
};

export type SegmentReport = {
  generatedAt: string;
  method: string;
  segments: SegmentSummary[];
  /** Sample members per segment for the scatter view: academic vs placement readiness. */
  points: { studentId: string; name: string; segmentId: string; academicReadiness: number; placementReadiness: number }[];
};

/* ------------------------------------------------------------------ */
/* Interventions                                                       */
/* ------------------------------------------------------------------ */

export type Intervention = {
  interventionId: string;
  studentId: string;
  studentName: string;
  department: string;
  label: string;
  domain: RiskDomain;
  status: InterventionStatus;
  owner: string;
  startedWeek: string;
  /** Score when the intervention started and now. */
  scoreBefore: number;
  scoreNow: number;
  reason: string;
};

/** Proposed endpoint: GET /api/interventions. */
export type InterventionReport = {
  generatedAt: string;
  currentWeek: string;
  interventions: Intervention[];
  outcomes: { label: string; domain: RiskDomain; completed: number; improved: number; averageGain: number }[];
};

/* ------------------------------------------------------------------ */
/* Data integration                                                    */
/* ------------------------------------------------------------------ */

export type DataSourceStatus = {
  key: DataAreaKey;
  label: string;
  file: string;
  fields: string[];
  rows: number;
  matchedStudents: number;
  missingValues: number;
  duplicatesRemoved: number;
  refreshed: string;
};

/** Proposed endpoint: GET /api/pipeline. */
export type PipelineReport = {
  generatedAt: string;
  studentsUnified: number;
  sources: DataSourceStatus[];
  steps: { title: string; detail: string }[];
  weights: { key: DataAreaKey; label: string; weight: number }[];
};
