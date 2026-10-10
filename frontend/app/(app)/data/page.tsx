import { ArrowRightIcon, FileCsvIcon, UserFocusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { CsvChecker } from "@/components/data/CsvChecker";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { formatDate, formatNumber } from "@/lib/format";
import { getPipelineReport } from "@/lib/pipeline";

export const metadata: Metadata = {
  title: "Data sources",
};

/** Opacity steps so neighbouring weight segments stay distinct; each is also labelled directly. */
const WEIGHT_TONES = ["bg-ink", "bg-ink/80", "bg-ink/65", "bg-ink/50", "bg-ink/40", "bg-ink/30", "bg-ink/20"];

export default async function DataSourcesPage() {
  const { data, origin } = await getPipelineReport();
  const totalRows = data.sources.reduce((s, x) => s + x.rows, 0);
  const totalMissing = data.sources.reduce((s, x) => s + x.missingValues, 0);
  const totalDupes = data.sources.reduce((s, x) => s + x.duplicatesRemoved, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data sources"
        description="Seven separate exports, cleaned and joined on student ID into one record per student. This is what every score and flag is built on."
      />

      <Panel index={1} title="From seven files to one student record">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,0.8fr)]">
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {data.sources.map((s) => (
              <li key={s.key} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2">
                <FileCsvIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.label}</span>
                  <span className="block font-mono text-[10.5px] text-ink-3">{s.file}</span>
                </span>
              </li>
            ))}
          </ul>
          <ArrowRightIcon aria-hidden="true" className="mx-auto hidden h-5 w-5 text-ink-3 lg:block" />
          <ol className="space-y-2">
            {data.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-xl px-1 py-1">
                <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 font-mono text-[11px] font-semibold text-ink-2">{i + 1}</span>
                <span>
                  <span className="block text-[13px] font-semibold text-ink">{step.title}</span>
                  <span className="block text-xs leading-relaxed text-ink-3">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <ArrowRightIcon aria-hidden="true" className="mx-auto hidden h-5 w-5 text-ink-3 lg:block" />
          <div className="rounded-[20px] bg-[#0d1117] p-5 text-white">
            <UserFocusIcon aria-hidden="true" weight="duotone" className="h-7 w-7 text-[#c8f13c]" />
            <p className="tabular mt-3 text-4xl font-semibold tracking-[-0.04em]">{formatNumber(data.studentsUnified)}</p>
            <p className="text-sm text-white/70">unified student records</p>
            <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs text-white/60">
              <div className="flex justify-between">
                <dt>Source rows read</dt>
                <dd className="tabular text-white">{formatNumber(totalRows)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Missing values filled</dt>
                <dd className="tabular text-white">{formatNumber(totalMissing)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Duplicates removed</dt>
                <dd className="tabular text-white">{formatNumber(totalDupes)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Panel>

      {data.findings?.length ? (
        <Panel index={2} title="What joining the sources revealed" description="Data-quality checks run on every load. They shape how the score and risks are built.">
          <ul className="space-y-2.5">
            {data.findings.map((finding) => (
              <li key={finding} className="flex gap-3 text-[13px] leading-relaxed text-ink-2">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />
                {finding}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        index={2}
        title="Check your own CSV files"
        description="Drop the exports to see which data area each one is, whether its columns are complete, and how many students join across all of them."
      >
        <CsvChecker />
      </Panel>

      <Panel
        index={2}
        title={
          <>
            How the Success Score is weighted{" "}
            <InfoTip align="left">Each area is scored 0-100 after cleaning, then combined with these weights. Faculty can see the breakdown for any student on their profile.</InfoTip>
          </>
        }
        description="Seven areas, one 0-100 score. Academic and placement risk are then scored separately on top."
      >
        <div className="flex h-10 gap-[2px] overflow-hidden rounded-xl" role="img" aria-label={data.weights.map((w) => `${w.label} ${Math.round(w.weight * 100)}%`).join(", ")}>
          {data.weights.map((w, i) => (
            <div key={w.key} className={`grid place-items-center ${WEIGHT_TONES[i]}`} style={{ width: `${w.weight * 100}%` }}>
              <span className={`tabular text-xs font-semibold ${i < 3 ? "text-on-inverse" : "text-ink"}`}>{Math.round(w.weight * 100)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-[2px]">
          {data.weights.map((w) => (
            <p key={w.key} className="truncate text-[11px] leading-tight text-ink-2" style={{ width: `${w.weight * 100}%` }} title={w.label}>
              {w.label}
            </p>
          ))}
        </div>
      </Panel>

      <Panel index={3} title="Source health" description="How completely each export matched the student register.">
        <div className="scroll-thin relative overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-medium">Source</th>
                <th scope="col" className="px-3 py-2 font-medium">Fields used</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Rows</th>
                <th scope="col" className="px-3 py-2 font-medium">Students matched</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Missing</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Duplicates</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">Refreshed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.sources.map((s) => {
                const share = s.matchedStudents / data.studentsUnified;
                return (
                  <tr key={s.key}>
                    <td className="py-3 pr-3">
                      <span className="block font-medium text-ink">{s.label}</span>
                      <span className="font-mono text-[11px] text-ink-3">{s.file}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex max-w-xs flex-wrap gap-1">
                        {s.fields.map((f) => (
                          <code key={f} className="rounded-md bg-surface-3 px-1.5 py-px font-mono text-[10.5px] text-ink-2">
                            {f}
                          </code>
                        ))}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-ink-2">{formatNumber(s.rows)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-3">
                          <div className={`h-full rounded-full ${share >= 0.97 ? "bg-risk-low" : "bg-risk-medium"}`} style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="tabular text-xs text-ink-2">{Math.round(share * 1000) / 10}%</span>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-ink-2">{s.missingValues}</td>
                    <td className="tabular px-3 py-3 text-right text-ink-2">{s.duplicatesRemoved}</td>
                    <td className="py-3 pl-3 text-right text-xs text-ink-3">{formatDate(s.refreshed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-3">Proposed handling: a student missing from one source keeps their record, and that area is estimated from the department median and labelled as estimated.</p>
      </Panel>

      <DemoFootnote endpoint="GET /api/pipeline" origin={origin} />
    </div>
  );
}
