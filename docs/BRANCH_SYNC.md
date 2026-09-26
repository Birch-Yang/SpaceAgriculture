# Finalized demo synchronization

All existing branches are synchronized to the integrated demo release dated 2026-09-26. Their original commits remain in merge history. The current renderer supersedes the early duplicate renderer; fixed orientation and transcript-based run submission take precedence over older rotation and submission implementations.

Run `npm run demo` for the local app, then open `/supply`. Run `npm run demo:script` for the Python reference. The shared catalog produces 200 harvest points in 12 turns against a target of 180. The Mission page retains its separate ten-turn network model. External database and messaging services still require configuration.

Validation: 15 simulation/completion tests, four crop/supply tests, TypeScript, production build, and a browser run matching Python.

For future finalized changes: fetch all branches, merge without rewriting history, resolve compatibility differences, run affected checks, push every branch, and verify the remote heads. Do not report synchronization complete if a protected branch or concurrent change prevents it.

Branches in this release:

- `chore/agronaut-branding`
- `codex/dev-game-client-polish`
- `codex/game-client-improvements`
- `codex/game-renderer-local`
- `codex/match3-invalid-swaps`
- `codex/non-ui-completion`
- `codex/submit-completed-runs`
- `codex/utility-bottleneck-visuals`
- `codex/utility-connectivity-status`
- `dev`
- `feat/agriculture-slots`
- `feat/bootstrap-simulation`
- `feat/game`
- `feat/ui-content`
- `feat/ui-integration`
- `main`
