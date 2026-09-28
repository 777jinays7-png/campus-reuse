# Campus ReUse — Student Resource Exchange Platform

A dynamic student-to-student marketplace built for the Cloud Computing and DevOps CCA 2 assessment.

## Features
- Professional responsive marketplace interface
- Student registration, login and logout with hashed passwords
- Search and category filtering
- Server-generated item cards from application data
- Authenticated item listing with validation
- Request an available item and track it on the dashboard
- Personal dashboard for listings and requests
- JSON APIs: `/api/items` and `/api/stats`
- `/health` endpoint with running commit ID
- Commit ID visible in the footer
- Automated tests and ESLint
- Docker container and GitHub Actions CI/CD

> Authentication and marketplace data are intentionally in-memory for this small academic demonstration. A production system would use a database and a secure session store.

## Run locally

```bash
npm install
npm test
npm run lint
npm start
```

Open http://localhost:3000

### Demo account

Create your own account from **Create account**. Passwords are hashed and sessions are stored in memory for this academic demo.

## Deploy to GitHub + Render

1. Create a **public GitHub repository** under your own account.
2. Upload this project, keeping `.github/workflows/ci-cd.yml`.
3. Create a Render **Web Service** from the repository.
4. Build command: `npm install --omit=dev`
5. Start command: `node server.js`
6. Health check path: `/health`
7. Turn Render Auto-Deploy **off** because GitHub Actions triggers deployment.
8. Create a Render Deploy Hook and save it in GitHub as the Actions secret `RENDER_DEPLOY_HOOK`.
9. Push to `main`. The workflow runs lint → tests → Docker build → health smoke test → Render deploy.

Never commit passwords, API keys, deploy-hook URLs, or other secrets.

## CCA 2 pipeline

```text
Git Push / Pull Request
        ↓
Lint + Automated Tests
        ↓
Docker Build + /health Smoke Test
        ↓
Deploy to Render (main only)
        ↓
Live Application + Commit ID
```

## Suggested meaningful commits
1. `feat: create campus reuse marketplace`
2. `feat: add dynamic item cards`
3. `feat: add item listing validation`
4. `feat: add search and category filters`
5. `feat: add student authentication`
6. `feat: add request workflow`
7. `feat: add student dashboard`
8. `style: redesign responsive marketplace UI`
9. `test: expand automated quality checks`
10. `ci: build docker image and deploy through actions`

## Project Architecture
Campus ReUse uses an Express.js server with server-generated pages and JSON API routes.
## Local Development
Run npm install to install dependencies, then npm start to launch the application on port 3000.
## API Documentation
GET /api/items returns marketplace items.
GET /api/stats returns marketplace statistics.
GET /health returns application health status.
## Testing
The project includes automated tests for health checks, authentication, item validation, item APIs, and statistics.
## Docker
The application can be packaged as a Docker container for consistent deployment.
## CI/CD Pipeline
GitHub Actions runs linting and tests, builds the Docker image, performs a health check, and deploys successful main-branch changes to Render.
