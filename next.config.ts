import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Whereby SDK's camera-effects package contains Emscripten code with a
  // Node-only branch (require("fs") / require("path")) that never runs in the
  // browser but must still resolve when bundling the classroom.
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/lib/empty-module.js' },
      path: { browser: './src/lib/empty-module.js' },
    },
  },
  // The Azure Speech SDK does runtime feature-detection and dynamic requires
  // that Next's bundler mangles; keep it external so it loads as a plain Node
  // module inside the server function.
  serverExternalPackages: ['microsoft-cognitiveservices-speech-sdk', 'heic-convert'],
  // The postinstall script downloads an ~80MB static ffmpeg to bin/ffmpeg for
  // speaking-test transcodes. Vercel's file tracer statically resolves the
  // `join(process.cwd(), 'bin', 'ffmpeg')` in test-speaking.ts and pulls the
  // binary into every function bundle that (transitively) imports it —
  // ballooning bundles and cold-start times. Exclude it everywhere, then
  // re-include it ONLY for the three routes that actually transcode audio.
  // (Glob note: '**' covers the [id] segment — literal brackets are glob
  // character classes and wouldn't match.)
  //
  // The `process.cwd()` in those paths also makes the tracer treat the whole project
  // folder as a possible runtime file, so a few functions (transcriptions,
  // audio-extract, pronunciation) were shipping public/, studio/, supabase/, docs and
  // mockups: ~290 MB each, stored again for every deployment (Vercel Functions
  // Storage). No server code reads these folders at runtime (public/ is served as
  // static files, not from functions), so keep them out of every function.
  outputFileTracingExcludes: {
    '*': [
      './bin/ffmpeg',
      './public/**',
      './studio/**',
      './supabase/**',
      './scripts/**',
      './mockups/**',
      './_to_delete/**',
      './eigo.io WEB/**',
      './*.md',
      './*.html',
      './*.docx',
      './*.pptx',
      './*.sql',
      './*.mjs',
      './*.tsbuildinfo',
    ],
  },
  outputFileTracingIncludes: {
    '/api/tests/attempts/**/submit': ['./bin/ffmpeg'],
    '/api/admin/tests/attempts/**/regrade': ['./bin/ffmpeg'],
    '/api/cron/grade-attempts': ['./bin/ffmpeg'],
    '/api/recordings/audio-extract': ['./bin/ffmpeg'],
    '/api/courses/pronunciation': ['./bin/ffmpeg'],
    '/api/transcriptions': ['./bin/ffmpeg'],
  },
};

export default nextConfig;
