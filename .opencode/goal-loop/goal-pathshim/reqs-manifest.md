# Goal: goal-sup shortcut on PATH via installer
Base: bb6236cef781c839b9d489c02484fd6875d9d119 | Date: 2026-10-14 | Slug: goal-pathshim | Goal-branch: feat/goal-pathshim
- [x] REQ-01 path shim + installer PATH ensure -- verify: shim runs from foreign CWD via PATH-dir probe + installer block idempotent with no dupes + ascii scan -- status: done
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-pathshim-req01 prompt `prompts/REQ-01.GP1.md` order "Implement REQ-01 path shim + installer PATH ensure per prompt file" re-fires: 0/3 retries: 0/3
- run1: 2026-10-14 pushed: bf7a511 | report: ok | acceptance: ok (parse clean, sandbox resolves+runs+forwards with PATH restored, idempotent COUNT=1 incl case-variant, ascii empty)
- pushed: bf7a511 (verified ls-remote) | report-tail: GP1 block last, SLOC +30/-1
- integrated: local main 20bc32e (merge --no-ff of pushed proof; green re-run post-merge: ascii 30/0, parse 0, shim content exact)
## Log
- 2026-10-14 goal opened; user ordered a bare `goal-sup` word working from anywhere after install
- 2026-10-14 REQ-01 done by feat/goal-pathshim-req01 (bf7a511) — merged to main as 20bc32e, green suite re-run clean
