<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1LJ0oYaunXcfO19FasEz8V-7TwLXrtm9E

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend (FastAPI + 舆情工作流)

### Install dependencies

From the project root:

`python -m pip install -r backend/requirements.txt`

### Configure LLM API Key

Create a `.env` at project root (or set system env vars). Configure at least one:

- `DEEPSEEK_API_KEY` (optional `DEEPSEEK_MODEL`)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AZURE_OPENAI_API_KEY` (plus `AZURE_OPENAI_ENDPOINT`)

### Run backend

From the project root:

`python -m uvicorn backend.api:app --reload --port 8000`

Endpoint:

- `POST http://localhost:8000/api/generate-report`
- Body: `{ "texts": ["..."] }`
- Response: `{ "report": "# ...markdown..." }`
