# Goal: Watch product rename + action bumps, publish 0.1.2
Base: 0bf825d | Date: 2026-10-13
- [ ] REQ-01 Rename Dispatch -> Watch across manifests (productName, window title, identifier, Cargo/npm package names); bundle output becomes Watch_*.exe/MSI
- [ ] REQ-02 Bump GitHub Actions past Node 20 deprecation (checkout/setup-node v4->v5; gh-release only if a newer major exists, else keep + caveat)
- [ ] REQ-03 Trio to 0.1.2 (package.json, tauri.conf.json, Cargo.toml + lock sync); CHANGELOG entries (watch/ + root); tag watch-v0.1.2 after merge (orchestrator)
## DAG
- REQ-01: no deps
- REQ-02: no deps (file-disjoint from REQ-01)
- REQ-03: after REQ-01..02
## Log
- 2026-10-13 WREN worker done (cab980e): rename + bumps + 0.1.2 trio green
  (tsc, vitest 33/33, cargo, version sims both directions).
- 2026-10-13 integration: fixed `watch/package-lock.json` name/version sync
  (worker left it, `npm ci` requires it); rebuilt debug `Watch.exe`;
  re-shot `docs/watch.png` (titlebar now Watch).
