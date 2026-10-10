# Railway preview deployment

Project: `keen-motivation`, environment: `production`.

- Website: https://frontend-production-852be.up.railway.app
- API health: https://backend-production-8cf9c.up.railway.app/api/health
- Railway project: https://railway.com/project/55327729-500e-43ee-85df-109103151161

Both services deploy the GitHub repository `Kama0f1/ByteXL-Hackathon-CampusPulse`, branch `main`. Railway builds and deploys new pushes that match each service's watch paths. Backend builds from the repository root; frontend builds from `/frontend`.

## Redeploy after changes

From PowerShell:

```powershell
cd "F:\Projects\ByteXL Hackathon\ByteXL-Hackathon-CampusPulse"
railway status
# Backend or dataset changes:
railway up --service BackEnd
# Frontend changes:
railway up --service FrontEnd
```

Normally push tested changes to `main` and let Railway deploy them. The CLI commands above are a manual alternative: upload the whole repository for either service and let each service's root-directory setting select its files. Check the selected project before uploading. Run `railway link` if this folder is not linked to `keen-motivation` / `production`.

## Service settings

Both services use Railpack and one replica. These settings are configured in Railway, not through a local railway.json file. Keep the backend to one replica and one Uvicorn worker while its store uses a JSON file and process-local lock. Use a transactional database before scaling horizontally.

### BackEnd

- Upload the repository root so `backend/` and `data/` are included together.
- The root `requirements.txt` is a standalone, pinned version of the backend dependencies. Keep it aligned with `backend/requirements.txt` when adding packages. Scikit-learn matches the model's saved version (1.6.1). Railpack installs dependencies before copying application files, so a reference to `backend/requirements.txt` alone does not work in its dependency-install layer.
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck: `/api/health`, timeout 300 seconds.
- Variables:
  - `RAILPACK_PYTHON_VERSION=3.12`
  - `PORT=8080`
  - `CORS_ORIGINS=https://frontend-production-852be.up.railway.app`
  - `CAMPUS_STORE_PATH=/campus-store/interventions_store.json`
- Persistent volume: `backend-volume`, mounted at `/campus-store`. Atomic file replacement keeps readers from seeing incomplete writes. Do not detach or delete the volume when redeploying.
- GitHub watch paths: `/backend/**`, `/data/**`, `/requirements.txt`.

### FrontEnd

- GitHub root directory: `/frontend`.
- GitHub watch path: `/frontend/**`.
- Build command: `npm run build`
- Start command: `npx next start --hostname 0.0.0.0 --port $PORT`
- Healthcheck: `/`, timeout 300 seconds. This confirms the web process is serving; also check live data in the dashboard.
- Variables:
  - `RAILPACK_NODE_VERSION=22`
  - `PORT=8080`
  - `NEXT_PUBLIC_API_URL=https://backend-production-8cf9c.up.railway.app`

Railway runs the start commands in its Linux environment; do not paste `$PORT` commands into local PowerShell. Changing `NEXT_PUBLIC_API_URL` requires rebuilding the frontend. Changing its public domain requires updating backend `CORS_ORIGINS`.

## Verify the deployed app

1. API health returns `status: ok`, `students: 1000`, and `placementModel: loaded`.
2. Open the website and use **Sign in to the demo**.
3. Dashboard shows **Live data**, and the student explorer contains 1,000 students.
4. Search for a student and open the profile.
5. Mark an alert handled, reload, verify it remains handled, then undo the test action.

## Current preview limits

Demo sign-in is not real authentication. Weekly history and subject attendance are generated from a single snapshot; they are labeled as simulated. The seven-area score currently includes overlapping coding/technical-skill measurements; the data-quality page discloses that overlap. Saved model training provenance and held-out predictive performance are unverified. An interactive file checker validates files locally; replacing the backend CSVs is still the ingestion path.

## Regression checks

```powershell
python -m unittest discover -s backend -p 'test_*.py' -v
cd frontend
npm ci
npm run lint
npm run build
```

The backend tests cover all 1,000 profiles, exact factor shares, score consistency, concurrent retry handling, persistent writes across processes, corrupt-store preservation, and invalid CSV rejection. Use a Python 3.12 virtual environment installed from the pinned requirements.

## First deployment verification

Verified 11 October 2026 (India time): both services reported SUCCESS. Nine API reads returned 200; health reported 1,000 students and a loaded model. Landing plus eight application pages loaded successfully, all application pages displayed Live data, demo sign-in and student search worked, and a browser alert update survived reload before being undone. Mobile navigation opened at 390px without horizontal overflow. No browser JavaScript exceptions were recorded during these checks. These are deployment smoke checks, not a resolution of the earlier correctness audit.
