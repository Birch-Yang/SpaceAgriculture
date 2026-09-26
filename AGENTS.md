<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Finalized changes and demo consistency

User directive (2026-09-26): use English for responses, UI, and new documentation. Every finalized change must be committed, validated, and merged into every existing local and origin branch, preserving branch-specific work. Fetch first; do not force-push or discard changes. Resolve conflicts explicitly, validate affected branches, and report any branch that could not be synchronized. A change is not fully delivered until branch synchronization is verified.

The official playable, ranked mission is `/game` with six crops from `src/data/crop-catalog.json`. `/supply` redirects to `/game`; the separate Supply Lab, Python reference, and 12-turn acceptance target were removed at the user's request. Use `docs/ACCEPTANCE_SIX_CROPS.md` for current acceptance. Do not use historical Supply Lab numbers as mission scores.
