# WebChat Operation Platform

Terminal-style webchat that converts natural language into shell commands, previews them for user confirmation, and dispatches to remote .NET agent servers.

## Architecture

```
ReactJS (Port 3000)
    │  REST API
    ▼
Python FastAPI (Port 8000)
    ├── PostgreSQL (Port 5432)   ← agent_servers registry
    └── Ollama/Gemma4 (Port 11434)  ← prompt → JSON command
         │  (after user confirms)
         ▼
.NET Agent (Port 5001)  ← executes bash/powershell
```

## Phase 1 Quick Start

### Prerequisites
- Docker & Docker Compose
- Ollama installed locally with Gemma4 pulled:
  ```
  ollama pull gemma3:4b
  ollama serve
  ```

### Run

```bash
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Default login: `admin` / `Admin@123`

### Run .NET Agent (on each target server)

```bash
cd agent
dotnet run --project WebChatAgent
# Agent listens on http://0.0.0.0:5001
```

Or via Docker:
```bash
cd agent
docker build -t webchat-agent .
docker run -d -p 5001:5001 \
  -e AgentSettings__ApiKey=your-key \
  webchat-agent
```

### Register Agent Server

After login, the seeded agent servers are already in DB. Add more via API:

```bash
curl -X POST http://localhost:8000/api/v1/agents/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-server",
    "host": "192.168.1.100",
    "port": 5001,
    "api_key": "my-agent-key",
    "os_type": "linux",
    "shell_type": "bash"
  }'
```

## Flow

1. User types: `"Show disk usage on server-linux-01"`
2. Backend fetches agent list from PostgreSQL
3. Calls Gemma4 → returns JSON:
   ```json
   {
     "command": "df -h",
     "shell_type": "bash",
     "description": "Show disk usage in human-readable format",
     "suggested_agent": "server-linux-01",
     "risk_level": "low"
   }
   ```
4. Frontend shows command preview + confirm/cancel dialog
5. User selects target server → clicks Confirm Execute
6. Backend POSTs to .NET Agent → agent runs command → returns output
7. Output displayed in chat

## Phase 2 (Planned)

- AD/LDAP login integration (replace local auth)
- mTLS mutual authentication between backend ↔ agent
- JWT signing with AD user claims
- Role-based command permissions
- Audit log with user attribution

## Project Structure

```
webchat-operation/
├── frontend/           ReactJS + Vite + TypeScript
│   └── src/
│       ├── pages/      LoginPage, ChatPage
│       ├── components/ CommandConfirmPanel
│       ├── services/   api.ts (axios)
│       └── store/      authStore.ts (zustand)
├── backend/            Python FastAPI
│   └── app/
│       ├── api/        auth.py, agents.py, chat.py
│       ├── core/       config, database, security
│       ├── models/     SQLAlchemy ORM
│       ├── schemas/    Pydantic schemas
│       └── services/   ai_service, agent_service
├── agent/              .NET 8 Web API
│   └── WebChatAgent/
│       ├── Controllers/ AgentController
│       ├── Services/   CommandExecutor
│       └── Models/     ExecuteRequest/Result
└── docker-compose.yml
```
