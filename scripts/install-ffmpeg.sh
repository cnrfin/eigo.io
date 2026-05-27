#!/bin/bash
# Downloads a static FFmpeg binary for the deployment platform.
# Runs as a postinstall script so the binary is available at runtime
# inside the serverless function bundle.
#
# On macOS (local dev) this is a no-op — developers use brew-installed ffmpeg.
# On Linux (Vercel build) it downloads a minimal static build.

set -e

DEST="bin/ffmpeg"

# Skip if already present (e.g. repeated npm install)
if [ -f "$DEST" ]; then
  echo "[install-ffmpeg] Already exists at $DEST, skipping."
  exit 0
fi

# Only download on Linux (Vercel build environment)
if [ "$(uname -s)" != "Linux" ]; then
  echo "[install-ffmpeg] Not Linux ($(uname -s)), skipping — use system ffmpeg for local dev."
  exit 0
fi

echo "[install-ffmpeg] Downloading static FFmpeg for Linux x64..."
mkdir -p bin

# Use John Van Sickle's widely-trusted static builds.
# Download the tarball and extract just the ffmpeg binary.
URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
curl -sL "$URL" | tar -xJ --wildcards '*/ffmpeg' --strip-components=1 -C bin

chmod +x "$DEST"
echo "[install-ffmpeg] FFmpeg installed at $DEST ($(du -h "$DEST" | cut -f1))"
