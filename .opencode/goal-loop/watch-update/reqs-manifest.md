# Goal: Watch self-update (check once + modal + install)
Base: d781a7b | Date: 2026-10-13
- [ ] REQ-01 One-shot update check at startup + manual button: latest watch-v* GitHub release vs app version; no intervals, no background
- [ ] REQ-02 In-app update modal (version + notes + Update/Later); Later dismisses for the session only
- [ ] REQ-03 Update executes: download setup-exe asset to temp, launch installer, quit Watch (new Tauri fs/shell surface minimal + scoped)
- [ ] REQ-04 Tests: semver compare, asset pick, modal render; tsc + vitest green
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01
- REQ-03: after REQ-02
- REQ-04: after REQ-01..03
## Log
- 2026-10-13 WUPD worker done: check once + modal + install, tsc clean,
  vitest 82/82 (25 new), cargo clean, no new deps, ASCII-clean.
- 2026-10-13 integration: read update.ts (sound); live-app proof shows the
  Check button rendered + chronological chat + running tool dot; UIA click
  cannot reach WebView2 buttons so the manual note path is covered by mocked
  fetch unit tests instead (latestWatchRelease/check/install all tested).
  Proof screenshot removed (check artifact, not showcase).
