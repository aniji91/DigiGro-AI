# DIGIGRO AI

An AI-powered app builder platform — describe what you want in natural language and DIGIGRO AI generates beautiful React applications with live preview.

Inspired by [Lovable.dev](https://lovable.dev).

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 18, Vite, React Router  |
| Backend  | Node.js, Express              |
| Database | MySQL 8                       |
| AI       | Anthropic Claude (primary), OpenAI fallback, demo mode |

## Features

- **Chat-to-build** — Describe apps in plain English, iterate with conversation
- **Live preview** — See generated React apps instantly in an iframe
- **Code editor** — View and edit generated `App.jsx` and CSS files
- **Download ZIP** — Export a full runnable Vite + React project
- **Push to GitHub** — Create a repo and push all project files
- **Project management** — Create, save, and delete projects
- **Auth** — JWT-based registration and login
- **Demo mode** — Works without an API key (smart template responses)

## Quick Start

### 1. Start MySQL

**Option A — Docker (recommended)**

```bash
docker compose up -d
```

**Option B — Local MySQL**

Create a database user and database matching `backend/.env.example`.

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if needed. Defaults work with Docker Compose.

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Initialize the database

```bash
npm run db:init
```

### 5. Start the servers

**Terminal 1 — Backend**

```bash
npm run dev:backend
```

**Terminal 2 — Frontend**

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173).

## AI Integration (Claude — like Lovable)

DIGIGRO AI uses **Anthropic Claude** as the primary model, the same family Lovable is built on.

Add your key to `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys). You need billing credits on your Anthropic account.

**Priority:** Claude → OpenAI (if `OPENAI_API_KEY` set) → demo mode (template responses).

### OpenAI fallback (optional)

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Without any API key, the platform runs in **demo mode** with template-based responses for todos, landing pages, dashboards, and more.

## Export & GitHub

In the project builder, use the header buttons:

- **Download** — Exports a ZIP with `package.json`, Vite config, `src/App.jsx`, and CSS. Run with `npm install && npm run dev`.
- **GitHub** — Creates a new repo on your account and pushes all files. Requires a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope. The token is used once and never stored.

## API Endpoints

| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/health`               | Health check             |
| POST   | `/api/auth/register`        | Create account           |
| POST   | `/api/auth/login`           | Sign in                  |
| GET    | `/api/auth/me`              | Current user             |
| GET    | `/api/projects`             | List projects            |
| POST   | `/api/projects`             | Create project           |
| GET    | `/api/projects/:id`         | Get project + files      |
| PATCH  | `/api/projects/:id`         | Update project           |
| DELETE | `/api/projects/:id`         | Delete project           |
| PUT    | `/api/projects/:id/files`   | Save files + preview     |
| GET    | `/api/projects/:id/download` | Download project ZIP    |
| POST   | `/api/projects/:id/github`  | Push project to GitHub   |
| POST   | `/api/ai/:projectId/generate` | Generate code from prompt |
| GET    | `/api/ai/:projectId/messages` | Chat history           |

## Project Structure

```
digigro-ai/
├── backend/
│   └── src/
│       ├── config/       # Database + schema init
│       ├── middleware/    # JWT auth
│       ├── routes/        # Auth, projects, AI
│       └── services/      # Claude / OpenAI / demo generation
├── frontend/
│   └── src/
│       ├── components/    # Chat, preview, code editor
│       ├── hooks/         # Auth context
│       ├── lib/           # API client
│       └── pages/         # Landing, dashboard, builder
└── docker-compose.yml     # MySQL
```

## License

MIT
