import { SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/app/actions/auth";
import { AlertsBell } from "@/components/shell/AlertsBell";
import { AppNav } from "@/components/shell/AppNav";
import { ColourKey } from "@/components/shell/ColourKey";
import { CommandPalette, type PaletteStudent } from "@/components/shell/CommandPalette";
import { MobileNav } from "@/components/shell/MobileNav";
import type { NavCounts } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ACCOUNT } from "@/lib/auth";
import { getAlerts } from "@/lib/alerts";
import { getCampusOverview } from "@/lib/overview";
import { getRiskReport } from "@/lib/risks";
import { getStudents } from "@/lib/students";

/** Shell for signed-in app pages. Access is checked in `proxy.ts`. */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ data: overview, origin }, { data: students }, { data: risks }, { data: alertReport }] = await Promise.all([getCampusOverview(), getStudents(), getRiskReport(), getAlerts()]);
  const thisWeek = alertReport.alerts.filter((a) => a.week === `W${alertReport.currentWeek.replace(/\D/g, "")}`);

  const counts: NavCounts = {
    students: overview.summary.studentsTracked,
    flagged: risks.flagged.length,
    segments: overview.segments.length,
    openInterventions: overview.summary.openInterventions,
    alertsThisWeek: thisWeek.length,
  };

  const toPalette = (s: (typeof students)[number]): PaletteStudent => ({
    studentId: s.studentId,
    name: s.name,
    department: s.department,
    semester: s.semester,
    successScore: s.successScore,
    academicRisk: s.academicRisk,
    placementRisk: s.placementRisk,
  });

  const account = (
    <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5 shadow-card">
      <Avatar name={DEMO_ACCOUNT.name} size="sm" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium text-ink">{DEMO_ACCOUNT.name}</p>
        <p className="truncate text-[11px] text-ink-3">{DEMO_ACCOUNT.role}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <SignOutIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo href="/dashboard" />
        </div>
        <div className="scroll-thin mt-8 flex-1 overflow-y-auto">
          <AppNav counts={counts} instance="sidebar" />
        </div>
        <ColourKey />
        {account}
      </aside>

      <div className="flex min-w-0 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-dvh flex-1 flex-col bg-canvas lg:min-h-0 lg:rounded-[24px] lg:border lg:border-line lg:bg-surface-2/60">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b sm:gap-3 border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6 lg:top-2 lg:rounded-t-[24px] lg:bg-surface-2/80 lg:px-8">
            <MobileNav counts={counts} footer={account} />
            <div className="lg:hidden">
              <Logo href="/dashboard" compact />
            </div>
            <div className="flex min-w-0 flex-1 justify-center lg:justify-start">
              <CommandPalette students={students.map(toPalette)} suggested={risks.flagged.slice(0, 5).map(toPalette)} />
            </div>
            <span className="hidden md:block">
              <DemoBadge origin={origin} />
            </span>
            <AlertsBell alerts={thisWeek.slice(0, 8)} total={thisWeek.length} />
            <ThemeToggle />
          </header>
          <main id="main-content" className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
