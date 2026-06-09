#!/bin/bash
# Chạy script này một lần khi có mạng để tải font về offline
set -e

FONT_DIR="public/fonts"
mkdir -p "$FONT_DIR"

echo "Downloading JetBrains Mono fonts..."

BASE="https://fonts.gstatic.com/s/jetbrainsmono/v18"

declare -A FONTS=(
  ["JetBrainsMono-Regular.woff2"]="${BASE}/tDbY2o-flEEny0FZhsfKu5WU4gqeJQ.woff2"
  ["JetBrainsMono-Medium.woff2"]="${BASE}/tDbY2o-flEEny0FZhsfKu5WU4rqeJQ.woff2"
  ["JetBrainsMono-Bold.woff2"]="${BASE}/tDbY2o-flEEny0FZhsfKu5WU4xqeJQ.woff2"
)

for FILE in "${!FONTS[@]}"; do
  URL="${FONTS[$FILE]}"
  echo "  -> $FILE"
  curl -sL "$URL" -o "$FONT_DIR/$FILE" \
    -H "User-Agent: Mozilla/5.0" \
    -H "Accept: */*"
done

echo "Done! Fonts saved to $FONT_DIR/"
