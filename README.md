# WebChat Operation Platform — Phase 1

## Deploy Offline — Quy trình chuẩn bị

Thực hiện các bước dưới đây trên **máy có internet**, cùng OS/arch với server offline.

---

### Bước 1 — Chuẩn bị Frontend

```bash
cd frontend

# Tải fonts + npm packages + build production bundle
bash offline-prepare.sh
```

Kết quả:
- `public/fonts/` — font woff2 local
- `dist/` — toàn bộ JS/CSS đã bundle, không cần CDN

Deploy lên server offline:
```bash
# Copy dist/ và public/fonts/ sang server
# Chạy bằng serve (đã bundle trong dist) hoặc nginx:
npx serve -s dist -l 3000

# Hoặc dùng nginx — trỏ root vào thư mục dist/
```

---

### Bước 2 — Chuẩn bị Backend Python

```bash
cd backend

# Tải toàn bộ pip wheels (cần cùng Python version + OS với server)
bash offline-prepare.sh
# → tạo thư mục wheels/
```

Deploy lên server offline:
```bash
# Copy cả thư mục backend/ (bao gồm wheels/) sang server
python3 -m venv .venv
source .venv/bin/activate
pip install --no-index --find-links=wheels/ -r requirements.txt

# Khởi tạo DB
psql -U webchat_user -d webchat -f init.sql

# Tạo user admin
python reset_password.py --user admin --password Admin@123

# Chạy server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### Bước 3 — Chuẩn bị .NET Agent

```bash
cd agent

# Publish thành binary tự chứa (không cần .NET runtime trên server)
bash offline-prepare.sh
# → tạo publish/linux-x64/WebChatAgent (hoặc win-x64)
```

Deploy lên từng server target:
```bash
# Copy thư mục publish/linux-x64/ sang server
chmod +x WebChatAgent
./WebChatAgent
# Agent lắng nghe tại http://0.0.0.0:5001
```

Cấu hình trong `appsettings.json` (cùng thư mục với binary):
```json
{
  "AgentSettings": {
    "ApiKey": "your-secret-key",
    "AllowedShells": ["bash"],
    "CommandTimeoutSeconds": 60
  },
  "Urls": "http://0.0.0.0:5001"
}
```

---

### Bước 4 — Ollama + Gemma4 (offline)

```bash
# Trên máy có mạng — tải model
ollama pull gemma3:4b

# Copy model files sang server offline
# Model lưu tại: ~/.ollama/models/

# Trên server offline — cài ollama binary
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama
OLLAMA_MODELS=/path/to/models ./ollama serve
```

---

### PostgreSQL

```bash
# Cài PostgreSQL qua package manager của OS (yum/apt)
# hoặc dùng offline rpm/deb đã tải sẵn

psql -U postgres -c "CREATE USER webchat_user WITH PASSWORD 'webchat_pass';"
psql -U postgres -c "CREATE DATABASE webchat OWNER webchat_user;"
psql -U webchat_user -d webchat -f backend/init.sql
```

---

## Luồng hoạt động

```
User → ReactJS (3000) → Python FastAPI (8000) → Ollama/Gemma4 (11434)
                                    ↓ (sau confirm)
                           .NET Agent (5001) → bash/powershell
```

## Cấu trúc project

```
webchat-operation/
├── frontend/
│   ├── public/fonts/          Font woff2 local (sau khi chạy offline-prepare.sh)
│   ├── src/
│   ├── dist/                  Production build (sau khi build)
│   ├── download-assets.sh     Tải fonts
│   └── offline-prepare.sh     Chuẩn bị offline (fonts + npm + build)
├── backend/
│   ├── wheels/                pip wheels offline (sau khi chạy offline-prepare.sh)
│   ├── app/
│   ├── init.sql
│   ├── reset_password.py
│   └── offline-prepare.sh     Tải pip wheels
└── agent/
    ├── WebChatAgent/
    ├── publish/               Self-contained binary (sau khi build)
    └── offline-prepare.sh     Build self-contained .NET binary
```

---

## Chạy Frontend trên server offline (không dùng npm run dev)

`npm run dev` là môi trường development — **không dùng cho production/offline**.  
Thay vào đó dùng `dist/` đã build sẵn:

### Cách 1 — nginx (recommended)
```bash
# Chỉnh đường dẫn dist trong config nếu cần
sudo bash frontend/nginx/setup-nginx.sh

# Hoặc thủ công:
sudo cp frontend/nginx/webchat.conf /etc/nginx/conf.d/
# Sửa `root` trong file conf trỏ đúng vào thư mục dist/
sudo nginx -t && sudo systemctl reload nginx
```

### Cách 2 — serve qua Node.js (không cần nginx)
```bash
cd frontend
node node_modules/serve/build/main.js -s dist -l 3000
```

### Cách 3 — python3 (test nhanh, không hỗ trợ F5 trên sub-route)
```bash
cd frontend/dist
python3 -m http.server 3000
```
