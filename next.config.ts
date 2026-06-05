import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The postinstall script downloads an ~80MB static ffmpeg to bin/ffmpeg for
  // speaking-test transcodes. Vercel's file tracer statically resolves the
  // `join(process.cwd(), 'bin', 'ffmpeg')` in test-speaking.ts and pulls the
  // binary into every function bundle that (transitively) imports it —
  // ballooning bundles and cold-start times. Exclude it everywhere, then
  // re-include it ONLY for the three routes that actually transcode audio.
  // (Glob note: '**' covers the [id] segment — literal brackets are glob
  // character classes and wouldn't match.)
  outputFileTracingExcludes: {
    '*': ['./bin/ffmpeg'],
  },
  outputFileTracingIncludes: {
    '/api/tests/attempts/**/submit': ['./bin/ffmpeg'],
    '/api/admin/tests/attempts/**/regrade': ['./bin/ffmpeg'],
    '/api/cron/grade-attempts': ['./bin/ffmpeg'],
    '/api/recordings/audio-extract': ['./bin/ffmpeg'],
  },
};

export default nextConfig;
