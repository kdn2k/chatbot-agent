#!/bin/bash
# Chạy với sudo trên server
set -e

DIST_DIR="$(cd "$(dirname "$0")/../dist" && pwd)"
CONF_SRC="$(cd "$(dirname "$0")" && pwd)/webchat.conf"

echo "=== Cài nginx config cho WebChat ==="

if ! command -v nginx &>/dev/null; then
  echo "✗ nginx chưa cài. Cài bằng: yum install nginx / apt install nginx"
  exit 1
fi

# Thay đường dẫn dist thực tế
sed "s|/opt/webchat/frontend/dist|$DIST_DIR|g" "$CONF_SRC" \
  > /etc/nginx/conf.d/webchat.conf

echo "✓ Config: /etc/nginx/conf.d/webchat.conf"
echo "✓ Serving dist: $DIST_DIR"
echo "✓ Proxy /api/ → http://127.0.0.1:8000"

nginx -t && systemctl reload nginx

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=== Truy cập từ client ==="
echo "  http://$IP:3000"
