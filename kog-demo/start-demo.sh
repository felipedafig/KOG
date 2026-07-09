#!/usr/bin/env bash
# Start the KOG demo on macOS/Linux. Stop with Ctrl+C.
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:$PORT/"
( sleep 1; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null ) &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  npx -y serve -l "$PORT" .
else
  echo "Python of Node.js niet gevonden — zie README.md voor alternatieven."
  exit 1
fi
