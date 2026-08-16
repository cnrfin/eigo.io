#!/bin/bash
# Downloads a static FFmpeg binary for the deployment platform (Linux/Vercel).
# On macOS (local dev) this is a no-op — developers use brew-installed ffmpeg.
#
# Primary source is a GitHub-CDN-hosted static binary (reliable, single file, no
# archive to corrupt). Falls back to a BtbN GitHub tarball. The old johnvansickle
# direct download was dropped: that host rate-limits/blocks cloud build IPs, and the
# previous `curl -sL | tar` piped error pages straight into tar ("tar: Error is not
# recoverable"). Every download here is fail-fast (`curl -f`), retried, and validated.

set -euo pipefail

DEST="bin/ffmpeg"

if [ -f "$DEST" ]; then
  echo "[install-ffmpeg] Already exists at $DEST, skipping."
  exit 0
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "[install-ffmpeg] Not Linux ($(uname -s)), skipping — use system ffmpeg for local dev."
  exit 0
fi

mkdir -p bin

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)
    PRIMARY_URL="https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64"
    FALLBACK_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
    ;;
  aarch64|arm64)
    PRIMARY_URL="https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-arm64"
    FALLBACK_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz"
    ;;
  *)
    echo "[install-ffmpeg] ERROR: unsupported arch $ARCH"
    exit 1
    ;;
esac

is_elf() {
  # first 4 bytes of an ELF executable are 7f 45 4c 46
  [ -f "$1" ] && [ "$(head -c4 "$1" | od -An -tx1 | tr -d ' \n')" = "7f454c46" ]
}

echo "[install-ffmpeg] Downloading static FFmpeg for $ARCH (primary)..."
if curl -fL --retry 4 --retry-delay 3 --max-time 180 -o "$DEST" "$PRIMARY_URL" && is_elf "$DEST"; then
  chmod +x "$DEST"
  echo "[install-ffmpeg] FFmpeg installed at $DEST ($(du -h "$DEST" | cut -f1))"
  exit 0
fi
rm -f "$DEST"
echo "[install-ffmpeg] Primary source failed or invalid, trying fallback tarball..."

TMPDIR="$(mktemp -d)"
if curl -fL --retry 4 --retry-delay 3 --max-time 300 -o "$TMPDIR/ff.tar.xz" "$FALLBACK_URL" && tar -xJf "$TMPDIR/ff.tar.xz" -C "$TMPDIR"; then
  FOUND="$(find "$TMPDIR" -name 'ffmpeg' -type f ! -name 'ffprobe' | head -1)"
  if [ -n "$FOUND" ] && is_elf "$FOUND"; then
    mv "$FOUND" "$DEST"
    chmod +x "$DEST"
    rm -rf "$TMPDIR"
    echo "[install-ffmpeg] FFmpeg installed from fallback at $DEST ($(du -h "$DEST" | cut -f1))"
    exit 0
  fi
fi
rm -rf "$TMPDIR"

echo "[install-ffmpeg] ERROR: all FFmpeg sources failed"
exit 1
