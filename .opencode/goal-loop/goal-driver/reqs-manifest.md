# Goal: driver loop — bounded auto re-fire, zero manual continues in-goal
Base: 36dbf9c | Date: 2026-10-14
- [ ] REQ-01 Skill: bounded re-fire rule (verify report+branch after every run; re-fire same prompt up to 3x per REQ, then mark blocked; loop ends DONE or explicit blocked, never silent)
- [ ] REQ-02 Worker prompt §3: never-yield rule (no DONE/blocked claim before acceptance met; a quiet turn is not completion)
- [ ] REQ-03 Live smoke: 2-REQ trivial goal proving /goal-to-DONE with zero manual continues + Landed line
## DAG
- REQ-01: no deps
- REQ-02: no deps
- REQ-03: after REQ-01..02 (orchestrator executes directly)
## Log
- 2026-10-14 WDRV done (91ef271): +136/-22, proofread, ASCII-clean.
- 2026-10-14 LAND: merged feat/goal-driver --no-ff (clean), pushing.
