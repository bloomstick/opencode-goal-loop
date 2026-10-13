# Goal: WIP spinner replaces badge on working sessions, green dot removed
Base: 534a071 | Date: 2026-10-13
- [ ] REQ-01 Animated "working" indicator that REPLACES the session's letter badge while that session is actually working (truthful signal from available data, no timers)
- [ ] REQ-02 Remove the green selected-card dot (duplicates the progress indicator)
- [ ] REQ-03 Keep selected-card highlight + badge behavior for idle sessions; tsc + vitest green
## DAG
- REQ-01: no deps (includes signal investigation)
- REQ-02: no deps
- REQ-03: after REQ-01..02
## Log
- 2026-10-13 WWIP worker done: spinner swaps badge on running tools only,
  green dot deleted, tsc clean, vitest 57/57, ASCII-clean.
- 2026-10-13 integration: visual proof passes (dot gone, badges + selected
  border intact; no live running tools at shot time so spinner covered by
  unit tests, not the still); refreshed `docs/watch.png`.
