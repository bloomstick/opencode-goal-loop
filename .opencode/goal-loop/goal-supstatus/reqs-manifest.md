# Goal: global supervisors status command
Base: fe7da6d8f7507fe27b841aedd7d5ee433685754b | Date: 2026-10-14 | Slug: goal-supstatus | Goal-branch: feat/goal-supstatus
- [x] REQ-01 Get-GoalSupervisors status command -- verify: Disabled probe tasks render correct verdicts + counts + tails + removal verified + ascii scan -- status: done
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-supstat-req01 prompt `prompts/REQ-01.ST1.md` order "Implement REQ-01 Get-GoalSupervisors status command per prompt file" re-fires: 0/3 retries: 0/3
- run1: 2026-10-14 pushed: 96a87da | report: ok | acceptance: ok (parse 0, RUNNING done:1 + STALE probes quoted, -Slug filter both ways, removal verified, ascii empty)
- pushed: 96a87da (verified ls-remote) | report-tail: ST1 block last, SLOC +202/-0
- integrated: local main 6af4d99 (merge --no-ff of pushed proof; green re-run post-merge: ascii 202/0, parse 0, command prints no-supervisors, tasks clean)
## Log
- 2026-10-14 goal opened; installer already ships scripts/goal-supervisor/* so no installer change needed, only the new script + docs
- 2026-10-14 REQ-01 done by feat/goal-supstat-req01 (96a87da) — merged to main as 6af4d99, green suite re-run clean
