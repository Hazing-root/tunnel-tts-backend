#!/bin/bash
# Setup script for Linux Mint (Ubuntu-based)

set -e                      # stop on first error
echo "🗣️  Tunnel TTS – Linux-Mint setup"
echo "=================================="
echo ""

# 1. Node ≥ 20 (Mint ships old one → we use Nodesource)
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1) < v20 ]]; then
  echo "📦 Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "✅ Node.js  $(node -v)"

# 2. Native TTS
echo ""
echo "📦 Installing espeak + alsa-utils…"
sudo apt-get update
sudo apt-get install -y espeak alsa-utils

# 3. NPM deps
echo ""
echo "📦 Installing npm packages…"
npm install

# 4. cloudflared (official Cloudflare repo)
if ! command -v cloudflared &>/dev/null; then
  echo ""
  echo "📦 Installing cloudflared…"
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
fi
echo "✅ cloudflared  $(cloudflared -v | awk '{print $3}')"

# 5. .env skeleton
if [[ ! -f .env ]]; then
  echo ""
  echo "⚠️  Creating .env file – **edit it before running!**"
  cat > .env <<'EOF'
# Speech Service Key – CHANGE THIS!
SPEECH_KEY=changeme

# Server URL (only needed if server is not on localhost)
# SERVER_URL=https://your-tunnel-url.cloudflare.io

# Port (optional)
# PORT=3000
EOF
fi

echo ""
echo "✅ Setup finished!"
echo "Next:  nano .env        # set a real SPEECH_KEY"
echo "       ./start-mint.sh  # fire everything up"
