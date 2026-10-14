# Goal: goal-sup shortcut on PATH via installer
Base: bb6236cef781c839b9d489c02484fd6875d9d119 | Date: 2026-10-14 | Slug: goal-pathshim | Goal-branch: feat/goal-pathshim
- [ ] REQ-01 path shim + installer PATH ensure -- verify: shim runs from foreign CWD via PATH-dir probe + installer block idempotent with no dupes + ascii scan -- status: pending
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-pathshim-req01 prompt `prompts/REQ-01.GP1.md` order "Implement REQ-01 path shim + installer PATH ensure per prompt file" re-fires: 0/3 retries: 0/3
## Log
- 2026-10-14 goal opened; user ordered a bare `goal-sup` word working from anywhere after install
