# TinyWins

TinyWins is a browser-only micro-productivity planner. Describe one task, choose your available time and energy, and it creates a deterministic, rule-based set of small next actions. Check off progress, say when a step did not help, or ask for a smaller first move.

Plans are generated locally in TypeScript. TinyWins does not call an AI service or any other planning API, and it does not save personal information or learn across sessions.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (usually <http://localhost:5173>). No backend, Python environment, API key, AWS account, or `.env` file is needed to use the app.

Create and check a production build:

```powershell
cd frontend
npm run build
npm run preview
```

## Deploy to AWS Amplify

The root `amplify.yml` configures the existing `frontend` directory as the Amplify app root. Connect this repository to Amplify and use the `main` branch (or your chosen branch). For Amplify monorepo detection, set the app build environment variable `AMPLIFY_MONOREPO_APP_ROOT` to `frontend` if Amplify asks for it. The build runs `npm ci` and `npm run build`, then publishes `frontend/dist`.

There are no deployment-time environment variables, AWS credentials, backend services, or paid APIs needed by the application.

## How the planner adapts

`frontend/src/planner.ts` contains the reusable planning rules. It chooses task-specific action templates (study, interview preparation, tidying, projects, or a general task), scales the number and size of actions based on selected time and energy, and offers a smaller action based on the remaining time, energy, unfinished step, and “Not yet” feedback. “Try another plan” selects a different deterministic ordering; the same inputs and variation always produce the same plan.

The old `backend/` FastAPI/Bedrock files are retained in the repository but are not used by the frontend or Amplify build. No planning request is sent to them.
