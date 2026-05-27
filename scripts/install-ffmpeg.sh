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

# Download and extract to a temp directory, then find the ffmpeg binary.
# The archive structure varies between releases so we search for it
# rather than assuming a specific path depth.
TMPDIR=$(mktemp -d)
URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
curl -sL "$URL" | tar -xJ -C "$TMPDIR"

# Find the ffmpeg binary (not ffprobe, not directories)
FOUND=$(find "$TMPDIR" -name 'ffmpeg' -type f ! -name 'ffprobe' | head -1)

if [ -z "$FOUND" ]; then
  echo "[install-ffmpeg] ERROR: ffmpeg binary not found in archive"
  ls -R "$TMPDIR"
  rm -rf "$TMPDIR"
  exit 1
fi

mv "$FOUND" "$DEST"
chmod +x "$DEST"
rm -rf "$TMPDIR"

echo "[install-ffmpeg] FFmpeg installed at $DEST ($(du -h "$DEST" | cut -f1))"
