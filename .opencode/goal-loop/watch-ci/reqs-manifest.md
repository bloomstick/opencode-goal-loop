# Goal: CI for watch in opencode-goal-loop
Base: f4be4a6 | Date: 2026-10-13
- [ ] REQ-01 Root workflow `.github/workflows/watch-release.yml`: runs in `watch/`, triggers `watch-v*` tags + `workflow_dispatch`, version check strips `watch-v` prefix, attaches NSIS `-setup.exe` (+ MSI) to GitHub Release, unsigned expected
- [ ] REQ-02 Delete dead `watch/.github/` (workflows never run from subdirs)
- [ ] REQ-03 Version trio consistent (`watch/package.json`, `tauri.conf.json`, `Cargo.toml` = 0.1.0); `CHANGELOG.md` Unreleased entry; first tag `watch-v0.1.0` stays a manual human step after merge
- [ ] REQ-04 Prove green via `workflow_dispatch` on the worker branch before merge (build-only, no release attach)
## DAG
- REQ-01: no deps
- REQ-02: no deps (file-disjoint from REQ-01)
- REQ-03: no deps
- REQ-04: after REQ-01..03 (orchestrator-gated, needs pushed branch)
## Log
- 2026-10-13 WCI worker done (178e78c): REQ-01..03 verified locally (YAML
  parse, version-check sim pass + negative probe fails as designed, no stale
  refs, ASCII-clean). REQ-04 blocked pre-merge: GitHub only registers
  workflows present on the default branch, so `watch-release` cannot be
  dispatched until the PR merges. Proof run fires on main right after.
