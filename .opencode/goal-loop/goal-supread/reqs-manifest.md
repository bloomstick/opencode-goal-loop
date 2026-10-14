# Goal: human-readable supervisor status output
Base: 1b951698049a422898f4959767c870a144b8ede8 | Date: 2026-10-15 | Slug: goal-supread | Goal-branch: feat/goal-supread
- [ ] REQ-01 readable status + in-flight verdict -- verify: fixture verdicts incl RE-FIRING quoted + local times + translated codes + ascii scan -- status: pending
## DAG
- REQ-01: no deps
## Runs
## Log
- 2026-10-15 goal opened; user pasted real output proving FAILING verdict + raw UTC decimals + unexplained codes while a nested re-fire (pid 1564, born at the STALL second) was alive and working; design: human times, translated codes, new RE-FIRING verdict via REFIRE-START marker
