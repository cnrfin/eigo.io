<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tests

- `npm run test:classroom`: the classroom test suite (human lessons in the eigo classroom). Run it after any change to `src/components/classroom/` or `src/lib/classroom/`, and before opening a pull request. See `tests/classroom/README.md`.
- Don't change a test to make it pass unless the behaviour it checks was meant to change.
- The AI tutor and slide courses were removed from the site in November 2026. Their code is on the `archive/ai-tutor-courses` branch; their database tables and data are kept.
