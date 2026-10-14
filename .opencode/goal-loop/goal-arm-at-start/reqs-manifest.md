# Goal: user only uses /goal (arm-at-start + live-fire e2e)
Base: 6113d2872482dc68706f4298eed5130e73e1539e | Date: 2026-10-14 | Slug: goal-arm-at-start | Goal-branch: feat/goal-arm-at-start
- [ ] REQ-01 arm-at-start rule + Register working directory -- verify: proofread (arm-at-start vs disarm vs awaiting-input consistent) + ascii scan -- status: pending
- [ ] REQ-02 live-fire e2e in contained fixture -- verify: observed STALL + REFIRE + worker marker + DONE on fixture main + supervisor NOOP after + task removed with zero residue -- status: pending
## DAG
- REQ-01: no deps
- REQ-02: after REQ-01 (uses Register -WorkingDirectory; must not modify scripts/)
## Runs
## Log
- 2026-10-14 goal opened; user ordered live-fire e2e; containment: Temp fixture repo + local bare origin, zero product impact
