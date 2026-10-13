# Changelog

## [Unreleased]

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
