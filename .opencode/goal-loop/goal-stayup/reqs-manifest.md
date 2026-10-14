# Goal: orchestrator stay-up — transient auto-retry + standing orders
Base: 95581cb | Date: 2026-10-14
- [ ] REQ-01 Transient-failure rule: rate-limit/connection/service-5xx deaths auto-retry in-turn with bounded backoff (no budget consumed from re-fire budget; own retry cap), then blocked-transient
- [ ] REQ-02 Standing orders: global file with pre-authorized powers read at loop start; orchestrator-turn end conditions (only DONE/blocked, external death, or explicitly-needed human input)
## DAG
- REQ-01: no deps
- REQ-02: no deps
## Log
- 2026-10-14 WSTAYUP done (6089817): +243/-63, proofread, ASCII-clean, installer parses.
- 2026-10-14 LAND: merged feat/goal-stayup --no-ff (clean), pushing.
- Correction: workers were never the stop point (smoke green first try); orchestrator turns die on restarts (RESUME covers) and transient infra failures (this goal).
