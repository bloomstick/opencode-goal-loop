# Changelog

## [Unreleased]

- `goal-loop`: LAND phase (SKILL.md new sec. 7): solo flow merges locally,
  pushes, proves - no PRs (no protection, no PR CI to gate on).
  Orchestrator: fetch origin, merge each worker branch into local `main`
  with `--no-ff` one at a time (green suite after each; resolve +
  re-verify on conflict), push main, prove (`ls-remote origin main` SHA
  equals local `main` + every worker commit contained in `origin/main`),
  remove TEMP worktrees. Report DONE gains `Landed:` line (origin/main
  SHA, local==remote proof, tag/release state). Workers still branch-only;
  tags pushed only when the goal says publish.

- `watch/` 0.1.3: chat fixes (chronological order, true-bottom follow,
  centered dot, badges + WIP pulse).

- `watch/` 0.1.2: Dispatch renamed to Watch (title, productName,
  `ai.watch.app` identifier, npm + Cargo names) + release actions past
  Node 20 (checkout/setup-node v5, action-gh-release v3).

- `watch/` 0.1.1: chat list polish (session cards, live badge, WIP
  indicators, dead CSS pruned) + refreshed `docs/watch.png` showcase shot.

- `watch/`: promote release workflow to repo root as
  `.github/workflows/watch-release.yml` (scoped to `watch/`, triggers on
  `watch-v*` tags + `workflow_dispatch`); delete the watch-subdir `.github`
  dir.
  Version trio stays `0.1.0`; first release tag `watch-v0.1.0` is a later
  manual human step. Unsigned Windows `.exe` (+ MSI) on the GitHub Release.
- `watch/`: optional attended worker-chat watcher (cut-down dispatch
  `feat/watch-only`: session list + SessionChat, Tauri shell kept,
  Board/GitHub/vision/scripts removed). Run via `watch/docs/WATCH.md`;
  not part of global install.

## [0.1.0] — 2026-10-13

- Initial `goal-loop` skill, `/goal` command, `goal-orch` / `goal-worker`
  agents (all `task`/subagent denied, foreground `opencode run` only).
- `Install-GoalLoop.ps1`: git clone/pull source + copy to global paths.
