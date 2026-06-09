#!/bin/bash
set -e

echo "=== Chuẩn bị offline Frontend ==="

echo "[1/4] Tải fonts..."
bash download-assets.sh

echo "[2/4] npm install..."
npm install

echo "[3/4] Build production..."
node node_modules/vite/bin/vite.js build

echo "[4/4] Kiểm tra localhost trong dist..."
COUNT=$(grep -ro "localhost" dist/assets/*.js 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "⚠ Còn $COUNT chỗ chứa 'localhost':"
  grep -ro "localhost[^'\"]*" dist/assets/*.js | head -10
else
  echo "✓ Không còn localhost trong dist — OK bưng đi đâu cũng chạy!"
fi

echo ""
echo "=== Xong! ==="
