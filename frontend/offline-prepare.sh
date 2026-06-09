#!/bin/bash
# Chạy script này trên máy CÓ MẠNG để chuẩn bị gói offline
# Sau đó copy toàn bộ thư mục frontend/ sang máy offline
set -e

echo "=== Chuẩn bị môi trường offline cho Frontend ==="

# 1. Download fonts
echo ""
echo "[1/3] Tải fonts..."
bash download-assets.sh

# 2. Install npm packages
echo ""
echo "[2/3] Cài npm packages..."
npm install

# 3. Build production bundle (tất cả JS/CSS đã bundle vào dist/)
echo ""
echo "[3/3] Build production bundle..."
npm run build

echo ""
echo "=== Hoàn tất! ==="
echo "Copy thư mục dist/ và public/fonts/ sang server offline"
echo "Chạy: npx serve -s dist -l 3000"
