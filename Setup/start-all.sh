#!/bin/bash
# Start everything (server + PC client) on Linux Mint
# Keeps both in foreground; Ctrl-C stops both.

set -e
echo "🚀 Tunnel TTS – Linux-Mint starter"
echo "=================================="
echo ""

# Safety checks
[[ -f .env ]] || { echo "❌ .env missing – run ./setup-mint.sh first"; exit 1; }
grep -q "changeme" .env && {
  echo "⚠️  Default SPEECH_KEY still in .env – edit it!"
  read -rp "Continue anyway? [y/N] " yn
  [[ $yn =~ ^[Yy]$ ]] || exit 1
}

# Install deps if node_modules absent
[[ -d node_modules ]] || { echo "📦 npm install…"; npm install; }

# Helper: kill background jobs on Ctrl-C
trap 'echo ""; echo "🛑 Stopping…"; jobs -p | xargs -r kill; exit 0' INT TERM

# 1. Start server
echo "🌐 Starting server…"
node server.js &
SERVER_PID=$!
sleep 2

# 2. Start PC client
echo "💻 Starting PC client…"
node client.js &
CLIENT_PID=$!
sleep 1

# 3. cloudflared hint
echo ""
echo "☁️  To expose globally, run in a 2nd terminal:"
echo "   cloudflared tunnel --url http://localhost:3000"
echo ""
echo "Local test:  http://localhost:3000"
echo "Press Ctrl-C to stop server + client"
echo ""

# Wait until user kills the script
wait
