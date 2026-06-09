#!/bin/bash
# Publish .NET agent thành self-contained binary — không cần .NET runtime trên server
set -e

echo "=== Build .NET Agent (self-contained, offline-ready) ==="

# Detect target OS
if [[ "$OSTYPE" == "linux"* ]]; then
  RID="linux-x64"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  RID="win-x64"
else
  RID="linux-x64"
fi

echo "Target RID: $RID"
echo ""

dotnet publish WebChatAgent/WebChatAgent.csproj \
  -c Release \
  -r "$RID" \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:PublishTrimmed=false \
  -o "publish/$RID"

echo ""
echo "=== Hoàn tất! ==="
echo "Binary tại: publish/$RID/WebChatAgent"
echo "Copy thư mục publish/$RID/ sang server offline"
echo "Chạy: ./WebChatAgent"
