# CampusPulse frontend

Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4, with `motion` for animation and Phosphor icons. Every page is built and runs on a **simulated campus of 640 invented students** until the analytics backend is connected.

## Run locally

Use Node.js 22 LTS (minimum 20.9). From the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. On Windows, `npm.cmd` works even when PowerShell blocks `npm.ps1`.

| Command | What it does |
|---|---|
| `npm.cmd run dev` | Development server with live reload |
| `npm.cmd run lint` | ESLint |
| `npm.cmd run typecheck` | Route types + TypeScript |
| `npm.cmd run build` | Production build |

## Pages

| Route | What faculty do there |
|---|---|
| `/` | Landing page. The hero shows all 640 students as dots you can regroup by risk, segment or readiness. |
| `/login` | One-click demo sign-in (no real accounts). |
| `/dashboard` | Overview: three "start here" actions, key numbers, risk trend, who needs help first, which data areas are slipping. |
| `/alerts` | Early-warning alerts by week: attendance falling below 75%, newly high risk, score drops, LMS drops, final-years predicted to miss placement. Filter and mark handled. |
| `/students` | Search, filter (department, risk, segment, quick filters), sort, page through and export CSV. |
| `/students/[id]` | One student: plain-language summary, academic and placement risk with each factor's share, placement prediction, subject-wise attendance, alerts, score breakdown, 4-week change, weekly early-warning grid, assignable follow-up. J/K jump between flagged students. |
| `/risks` | Clickable academic × placement risk grid, campus-wide risk drivers, trend, newly flagged, departments, final-years predicted to miss placement. |
| `/segments` | Six student groups on a readiness map, each with its profile and a suggested group intervention. |
| `/interventions` | Board of follow-ups (drag between Suggested, Assigned, In progress, Completed) and whether they worked. |
| `/data` | How the seven sources are cleaned and joined, a CSV checker (drop the files in `../data` to see them recognised and joined, in the browser only), score weights, source health. |

Anywhere in the app: **Ctrl K** (or `/`) searches every student and page, the bell shows this week's alerts, the moon/sun button switches light and dark, and the sidebar explains the colours.

## Folder structure

```
app/
  (marketing)/          landing page and login
  (app)/                signed-in pages; layout.tsx is the sidebar + top bar shell
  actions/auth.ts       demo sign-in / sign-out
  globals.css           design tokens (light + dark), shared utilities
components/
  shell/                sidebar navigation, command palette, theme toggle, mobile drawer
  ui/                   small shared pieces: Panel, PageHeader, StatTile, RiskBadge, InfoTip, Button...
  charts/               hand-built SVG charts: LineChart, Histogram, SignalHeatmap, DepartmentRiskChart
  overview/ alerts/ students/ risks/ segments/ interventions/ data/ landing/   page-specific components
lib/
  types.ts              data contracts shared with the backend
  overview.ts alerts.ts students.ts risks.ts segments.ts interventions.ts pipeline.ts
                        one data function per page: the only place to switch from demo data to the API
  demo/campus.ts        seeded generator for the simulated campus
  api.ts                backend fetch helpers
  format.ts labels.ts   display formatting and shared labels
proxy.ts                sends signed-out visitors to /login
```

## Design rules

- Colours are CSS variables in `app/globals.css`, defined separately for light and dark. Use Tailwind classes such as `bg-surface`, `text-ink-2`, `border-line`.
- **Academic is always blue, placement always orange**, and they are never merged into one risk number.
- Risk level is never shown by colour alone: high = triangle, medium = square, low = circle, always with a text label (`RiskBadge`).
- Charts are plain SVG with hover tooltips and keyboard reading; no chart library.
- Pages that show simulated values end with a one-line note naming the proposed endpoint, and the top bar shows a "Demo data" badge.

## Connecting the backend

Only `GET /api/health` exists in the backend today. The frontend expects these **proposed** endpoints, each returning the type in `lib/types.ts`:

| Endpoint | Type | Data function |
|---|---|---|
| `GET /api/overview` | `CampusOverview` | `lib/overview.ts` |
| `GET /api/students` | `StudentRow[]` | `lib/students.ts` |
| `GET /api/students/{id}` | `StudentProfile` | `lib/students.ts` |
| `GET /api/risks` | `RiskReport` | `lib/risks.ts` |
| `GET /api/segments` | `SegmentReport` | `lib/segments.ts` |
| `GET /api/interventions` | `InterventionReport` | `lib/interventions.ts` |
| `GET /api/pipeline` | `PipelineReport` | `lib/pipeline.ts` |
| `GET /api/alerts` | `AlertReport` | `lib/alerts.ts` |

To connect one, fetch it in its data function and return `{ origin: "api", data }`. The frontend displays scores, risk levels and explanations; it does not compute them. The backend URL defaults to `http://localhost:8000`; copy `.env.example` to `.env.local` to change it. Never put private keys in `NEXT_PUBLIC_` variables.

## Demo sign-in

There are no real accounts. Pressing **Sign in to the demo** sets an httpOnly cookie for 8 hours. Replace this with real authentication before using real student data. Interactive actions in the demo (assigning a follow-up, moving board cards, planning a segment session) are not saved.

## Tooling

`.claude/skills/` and `skills-lock.json` hold the design skills used to build the interface (installed with `npx skills add`). They are not part of the app.
