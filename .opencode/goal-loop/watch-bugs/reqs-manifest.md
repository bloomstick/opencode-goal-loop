# Goal: watch chat bugs (order, autoscroll, indicator, icons)
Base: f238a5b | Date: 2026-10-13
- [ ] REQ-01 Chat history in chronological order (oldest top, newest bottom); fix the folding/selection pipeline, keep stable message-id keys
- [ ] REQ-02 Autoscroll reaches the true bottom for all messages (investigate follow logic, container sizing, sticky jump control)
- [ ] REQ-03 Selected-card watching indicator vertically centered
- [ ] REQ-04 Session badges: letter avatar from title + animated WIP indicator on the watched session, light/dark themes, no emoji
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01 (follow logic assumes append-at-bottom order)
- REQ-03: no deps
- REQ-04: no deps
## Log
- 2026-10-13 WBUG worker done (ff26723): root causes fixed, tsc clean,
  vitest 52/52 (33 + 19 new), ASCII-clean, Caveats: none.
- 2026-10-13 integration: visual proof passes (chronological 6m->1m,
  true-bottom stick, centered dot, letter badges); refreshed
  `docs/watch.png` with the fixed UI.
