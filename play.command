#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-8000}"
URL="http://localhost:${PORT}"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python が見つかりません。Python 3 をインストールしてから再実行してください。"
  read -r -p "Enterキーで閉じます..." _
  exit 1
fi

(
  sleep 1
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  else
    echo "ブラウザで $URL を開いてください。"
  fi
) &

echo "放課後フラッグパニックを起動します。"
echo "ブラウザが開かない場合は $URL を開いてください。"
echo "終了するときは、このウィンドウで Ctrl+C を押してください。"
"$PYTHON_BIN" -m http.server "$PORT"
