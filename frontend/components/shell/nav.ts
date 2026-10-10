export type NavCounts = {
  students: number;
  flagged: number;
  segments: number;
  openInterventions: number;
  alertsThisWeek: number;
};

export type NavKey = "dashboard" | "alerts" | "students" | "risks" | "segments" | "interventions" | "data";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  /** Plain-language description, used by the command palette. */
  hint: string;
  count?: keyof NavCounts;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { key: "dashboard", href: "/dashboard", label: "Overview", hint: "Campus trends and who needs attention" },
      { key: "alerts", href: "/alerts", label: "Alerts", hint: "What changed this week and who it affects", count: "alertsThisWeek" },
      { key: "risks", href: "/risks", label: "Risks", hint: "Academic and placement risk, and what drives it", count: "flagged" },
    ],
  },
  {
    label: "Students",
    items: [
      { key: "students", href: "/students", label: "All students", hint: "Search, filter and open any student", count: "students" },
      { key: "segments", href: "/segments", label: "Segments", hint: "Clusters for group interventions", count: "segments" },
    ],
  },
  {
    label: "Act",
    items: [
      { key: "interventions", href: "/interventions", label: "Interventions", hint: "Follow-ups and whether they worked", count: "openInterventions" },
      { key: "data", href: "/data", label: "Data sources", hint: "How the seven data areas are combined" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
