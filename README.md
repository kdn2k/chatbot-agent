# WebChat Operation Platform — Phase 1

Terminal-style webchat: nhập tiếng tự nhiên → Gemma4 parse → JSON command preview → user confirm → .NET agent thực thi.

## Yêu cầu

| Thành phần | Yêu cầu |
|---|---|
| Node.js | >= 18 |
| Python | >= 3.11 |
| PostgreSQL | >= 14 (running locally) |
| .NET SDK | >= 8.0 |
| Ollama | Đã cài, có model gemma3:4b |

---

## 1. PostgreSQL — Tạo DB và schema

```bash
# Tạo user + database
psql -U postgres -c "CREATE USER webchat_user WITH PASSWORD 'webchat_pass';"
psql -U postgres -c "CREATE DATABASE webchat OWNER webchat_user;"

# Chạy schema
psql -U webchat_user -d webchat -f backend/init.sql
```

---

## 2. Ollama — Kéo model Gemma4

```bash
ollama pull gemma3:4b
ollama serve          # chạy ở port 11434
```

---

## 3. Backend — Python FastAPI

```bash
cd backend

# Tạo virtualenv
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Cài thư viện
pip install -r requirements.txt

# Cấu hình (sửa nếu cần)
cp .env .env.local   # hoặc chỉnh thẳng .env

# Chạy
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs  
Default login: `admin` / `Admin@123`

---

## 4. Frontend — ReactJS

```bash
cd frontend

npm install
npm run dev          # dev server port 3000
```

Mở: http://localhost:3000

---

## 5. .NET Agent — Deploy trên từng server target

```bash
cd agent

dotnet restore
dotnet run --project WebChatAgent
# Agent lắng nghe tại http://0.0.0.0:5001
```

**Cấu hình agent** trong `WebChatAgent/appsettings.json`:
- `AgentSettings:ApiKey` — key phải khớp với `api_key` trong DB
- `AgentSettings:AllowedShells` — bash / powershell / cmd
- `AgentSettings:BlacklistedCommands` — các lệnh bị chặn

---

## Luồng hoạt động

```
User nhập: "Kiểm tra disk space trên server-linux-01"
    │
    ▼
Backend lấy danh sách agent servers từ PostgreSQL
    │
    ▼
Gọi Gemma4 (Ollama) → trả JSON:
{
  "command": "df -h",
  "shell_type": "bash",
  "description": "Hiển thị dung lượng đĩa dạng human-readable",
  "suggested_agent": "server-linux-01",
  "risk_level": "low"
}
    │
    ▼
Frontend hiển thị preview + nút Confirm / Cancel
    │  (user nhấn Confirm, chọn server)
    ▼
Backend POST tới .NET Agent: http://192.168.1.10:5001/api/execute
    │
    ▼
Agent chạy lệnh, trả output → hiển thị trong chat
```

---

## Thêm Agent Server mới vào DB

```bash
curl -X POST http://localhost:8000/api/v1/agents/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "server-app-01",
    "description": "App server Linux",
    "host": "192.168.1.50",
    "port": 5001,
    "api_key": "agent-key-app-01",
    "os_type": "linux",
    "shell_type": "bash"
  }'
```

---

## Cấu trúc project

```
webchat-operation/
├── frontend/                   ReactJS + Vite + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── components/
│   │   │   └── CommandConfirmPanel.tsx
│   │   ├── services/api.ts     axios, tự thêm JWT header
│   │   └── store/authStore.ts  Zustand
│   ├── .env
│   └── package.json
│
├── backend/                    Python FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py         POST /auth/login, GET /auth/me
│   │   │   ├── agents.py       GET/POST /agents/, GET /agents/{id}/ping
│   │   │   └── chat.py         POST /chat/send, /chat/execute, /chat/cancel
│   │   ├── core/
│   │   │   ├── config.py       Settings từ .env
│   │   │   ├── database.py     SQLAlchemy async engine
│   │   │   └── security.py     JWT, bcrypt
│   │   ├── models/             SQLAlchemy ORM
│   │   ├── schemas/            Pydantic v2
│   │   └── services/
│   │       ├── ai_service.py   Gọi Ollama → parse JSON
│   │       └── agent_service.py HTTP dispatch tới .NET agent
│   ├── init.sql                Schema + seed data
│   ├── .env
│   └── requirements.txt
│
└── agent/                      .NET 8 Web API
    └── WebChatAgent/
        ├── Controllers/
        │   └── AgentController.cs   GET /api/health, POST /api/execute
        ├── Services/
        │   └── CommandExecutor.cs   Chạy bash/powershell, timeout, blacklist
        ├── Models/Models.cs
        ├── Program.cs
        └── appsettings.json
```

---

## Phase 2 (kế tiếp)

- Đăng nhập AD/LDAP thay local auth
- mTLS giữa backend ↔ agent (mutual TLS certificate)
- Role-based permission theo AD group
- Audit log đầy đủ
