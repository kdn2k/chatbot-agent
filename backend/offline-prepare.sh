#!/bin/bash
# Chạy trên máy CÓ MẠNG, cùng OS/Python version với server offline
set -e

echo "=== Chuẩn bị pip packages offline ==="

PYTHON=${PYTHON:-python3}
WHEEL_DIR="wheels"

mkdir -p "$WHEEL_DIR"

echo "Python: $($PYTHON --version)"
echo "Tải wheels vào thư mục: $WHEEL_DIR/"
echo ""

# Download tất cả dependencies dưới dạng .whl
$PYTHON -m pip download \
  -r requirements.txt \
  -d "$WHEEL_DIR" \
  --python-version 3.9 \
  --platform linux_x86_64 \
  --only-binary=:all:

echo ""
echo "=== Hoàn tất! ==="
echo "Copy thư mục wheels/ sang server offline"
echo "Cài đặt offline bằng:"
echo "  python3 -m venv .venv"
echo "  source .venv/bin/activate"
echo "  pip install --no-index --find-links=wheels/ -r requirements.txt"
