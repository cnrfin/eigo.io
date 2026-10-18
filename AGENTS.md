<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tests

- `npm run test:classroom`: the classroom and AI-tutor test suite (about 7 minutes; `-- unit` for the quick unit tests only). Run it after any change to `src/components/classroom/`, `src/lib/ai-tutor/`, `src/lib/roleplay/` or `src/lib/classroom/`, and before opening a pull request. See `tests/classroom/README.md`.
- `npm run check:roleplay`: checks every role-play scene. How to write scenes: `docs/roleplay-authoring.md`.
- Don't change a test to make it pass unless the behaviour it checks was meant to change.
