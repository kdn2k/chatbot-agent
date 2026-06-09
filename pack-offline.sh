#!/bin/bash
# Chạy SAU KHI đã chạy tất cả offline-prepare.sh
# Dùng tar để giữ symlinks trong node_modules (quan trọng!)

set -e
OUTPUT="webchat-operation-offline-$(date +%Y%m%d).tar.gz"

echo "=== Đóng gói offline bundle ==="
echo ""

# Dùng tar với -h để follow symlinks, hoặc không dùng -h để giữ symlink gốc
# KHÔNG dùng zip/cp -r vì sẽ mất symlinks trong node_modules
tar -czf "$OUTPUT" \
  --exclude='./backend/.venv' \
  --exclude='./backend/app/**/__pycache__' \
  --exclude='./backend/__pycache__' \
  --exclude='./agent/WebChatAgent/bin' \
  --exclude='./agent/WebChatAgent/obj' \
  --exclude='./frontend/.vite' \
  --exclude='./.git' \
  --exclude='**/.DS_Store' \
  --exclude='**/*.pyc' \
  .

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo ""
echo "✓ Tạo xong: $OUTPUT ($SIZE)"
echo ""
echo "Giải nén trên server offline:"
echo "  tar -xzf $OUTPUT"
echo ""
echo "Chạy frontend:"
echo "  cd frontend"
echo "  npm run dev          # node_modules đã có sẵn, không cần npm install"
echo ""
echo "Chạy backend:"
echo "  cd backend"
echo "  python3 -m venv .venv"
echo "  source .venv/bin/activate"
echo "  pip install --no-index --find-links=wheels/ -r requirements.txt"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "Chạy agent (trên server target):"
echo "  cd agent/publish/linux-x64"
echo "  ./WebChatAgent"
