/** Attendance per subject against the 75% exam-eligibility line. */
export function SubjectAttendance({ subjects, overall }: { subjects: { subject: string; pct: number }[]; overall: number }) {
  const below = subjects.filter((s) => s.pct < 75);

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink-2">
        Overall <span className="tabular font-semibold text-ink">{overall}%</span>.{" "}
        {below.length ? (
          <>
            Below 75% in <span className="font-semibold text-risk-high-ink">{below.map((s) => s.subject).join(" and ")}</span>, which can block those exams.
          </>
        ) : (
          "Every subject is above the 75% line."
        )}
      </p>
      <ul className="mt-4 space-y-3">
        {[...subjects]
          .sort((a, b) => a.pct - b.pct)
          .map((s) => (
            <li key={s.subject}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate text-ink-2">{s.subject}</span>
                <span className={`tabular font-semibold ${s.pct < 75 ? "text-risk-high-ink" : "text-ink"}`}>{s.pct}%</span>
              </div>
              <div className="relative mt-1.5 h-2 rounded-full bg-surface-3">
                <div className={`h-full rounded-full ${s.pct < 75 ? "bg-risk-high" : "bg-ink-2"}`} style={{ width: `${s.pct}%` }} />
                <div aria-hidden="true" className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: "75%" }} />
              </div>
            </li>
          ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
        <span aria-hidden="true" className="h-3 w-0.5 rounded bg-ink" /> 75% needed to sit the exam
      </p>
    </div>
  );
}
