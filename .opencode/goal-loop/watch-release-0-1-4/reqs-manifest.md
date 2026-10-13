# Goal: Release a new watch version if it has changes
Base: 876fcccae7aed34b00085d82eac15d133b8271ca | Date: 2026-10-14
- [x] REQ-01 Bump watch version trio 0.1.3 -> 0.1.4 (watch/package.json + watch/src-tauri/tauri.conf.json + watch/src-tauri/Cargo.toml, Cargo.lock if needed) — verify: version consistency check (pkg==tauri==cargo==0.1.4)
- [x] REQ-02 Changelog entries for 0.1.4 (watch/CHANGELOG.md + CHANGELOG.md Unreleased->0.1.4 notes: spinner swaps badge + self-update) — verify: files contain 0.1.4 section
- [x] REQ-03 Green suite + version gate (npx tsc --noEmit + npm test + workflow version check) — verify: tsc clean + vitest green + versions match
- [ ] REQ-04 Tag watch-v0.1.4 and push tag to trigger watch-release.yml (publish) — verify: git ls-remote origin refs/tags/watch-v0.1.4 exists + GitHub Release workflow triggered
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01
- REQ-03: after REQ-01..02
- REQ-04: after REQ-01..03 (orchestrator LAND, publish allowed by goal)
## Log
- 2026-10-14 REQ-01..03 done by feat/watch-0-1-4 d56ac04c3b6d0152695beeb540a191292f4defab merged as f3f9b06 — trio 0.1.4x3, changelogs, tsc clean, vitest 82/82, gate OK
