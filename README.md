# TinyWins

TinyWins turns an overwhelming task into exactly three realistic next steps, tailored to the time and energy you have. Use **Make it smaller** to break any step into an easier first action.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- Python 3.10+
- An AWS account with access to the configured Amazon Bedrock model to generate plans

The frontend and API start locally without AWS credentials, but requesting a plan requires working Bedrock access. The app does not use fake responses when AWS is unavailable.

## Start the backend

From the project root, create a virtual environment and install backend dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

The backend reads these non-secret configuration variables from `backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AWS_REGION` | `us-east-1` | AWS region used for Bedrock requests |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-haiku-20240307-v1:0` | Bedrock model identifier |

Create your local config from the template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` only if you need to change the defaults. `.env` is ignored by git; `.env.example` contains configuration defaults only, not credentials.

Configure AWS credentials separately through the AWS CLI, IAM Identity Center, environment, or another supported boto3 credential provider. For a named AWS CLI profile, set `AWS_PROFILE` in the backend process environment (for example, `$env:AWS_PROFILE = "my-profile"` in PowerShell). Never put AWS credentials in `.env`, the frontend, or source control. Confirm that the model is enabled for your account in the selected region.

Run the API from the project root:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The equivalent command from inside `backend\` is:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The FastAPI instance is `app` in `backend\app\main.py`. `main:app` expects a `main.py` module in the current import path, and `app:app` expects the package's `__init__.py` to export an `app`; neither is the entry point here.

Health check: <http://localhost:8000/api/health>. Interactive API docs: <http://localhost:8000/docs>.

## Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually <http://localhost:5173>). Vite proxies `/api` requests to the backend on port 8000.

## Tests and production build

From the project root, with the backend dependencies installed:

```powershell
python -m pytest backend\tests -q
```

The tests mock the Bedrock boundary and do not need AWS credentials. To build the frontend:

```powershell
cd frontend
npm run build
```

## API

- `GET /api/health` — local service health.
- `POST /api/plan` — accepts `{ "task": "...", "available_minutes": 20, "energy": "Medium" }`; returns exactly three steps.
- `POST /api/steps/smaller` — accepts the task, one selected step, and energy; returns a smaller step.

Both AI endpoints use Amazon Bedrock's Converse API. `AWS_REGION` and `BEDROCK_MODEL_ID` can be overridden in the backend environment.
