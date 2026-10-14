# Goal: remove backoff waits, keep 3 immediate retries
Base: 99525a7d46190c060ea62af8f2e0e821d032b622 | Date: 2026-10-15 | Slug: goal-nowait | Goal-branch: feat/goal-nowait
- [x] REQ-01 strip all 2/5/10 waits -- verify: residual grep (only historical CHANGELOG entry left, intentionally kept) + ascii clean -- status: done
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- inline: 2026-10-15 orchestrator-direct (files: SKILL + agent + standing-orders + CHANGELOG; plus 1-line stale-MAY fix in standing orders found while open, disclosed)
- inline-result: done (transient = immediate identical re-dispatch x3, no waits/sleeps; counters, budgets, blocked-transient, RESUME, supervisor unchanged; ascii 19/0)
## Log
- 2026-10-15 user ordered waits gone as hallucination; scoped to waits-only per follow-up (3 retries remain, supervisor remains)
