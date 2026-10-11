import type { Metadata } from "next";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { DataNote } from "@/components/ui/DataNote";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { getAlerts } from "@/lib/alerts";

export const metadata: Metadata = {
  title: "Alerts",
};

export default async function AlertsPage() {
  const { data, origin } = await getAlerts();
  const thisWeek = data.alerts.filter((a) => a.week === `W${data.currentWeek.replace(/\D/g, "")}`).length;
  const high = data.alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description={
          <>
            <strong className="font-semibold text-ink">{thisWeek}</strong> new this week, {high} urgent over the last four weeks. Alerts fire the week something changes, so
            you hear about it before results day.
          </>
        }
      />
      <DataNote>Attendance crossings and new-risk alerts use generated weekly records. Placement alerts use the current snapshot and model.</DataNote>
      <Panel
        index={1}
        title={
          <>
            What changed recently{" "}
            <InfoTip align="left">
              Rules: attendance crossing below 75%, a student becoming high risk, a 5-point score drop in four weeks, a sharp fall in LMS activity, and final-years the
              placement model gives under 25% chance of being placed.
            </InfoTip>
          </>
        }
        description="Newest first. Open the student to see why, then mark the alert handled."
      >
        <AlertFeed alerts={data.alerts} currentWeek={data.currentWeek} live={origin === "api"} />
      </Panel>
      <DemoFootnote endpoint="GET /api/alerts" origin={origin} />
    </div>
  );
}
