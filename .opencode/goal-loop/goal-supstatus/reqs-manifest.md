# Goal: global supervisors status command
Base: fe7da6d8f7507fe27b841aedd7d5ee433685754b | Date: 2026-10-14 | Slug: goal-supstatus | Goal-branch: feat/goal-supstatus
- [ ] REQ-01 Get-GoalSupervisors status command -- verify: Disabled probe tasks render correct verdicts + counts + tails + removal verified + ascii scan -- status: pending
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-supstat-req01 prompt `prompts/REQ-01.ST1.md` order "Implement REQ-01 Get-GoalSupervisors status command per prompt file" re-fires: 0/3 retries: 0/3
## Log
- 2026-10-14 goal opened; installer already ships scripts/goal-supervisor/* so no installer change needed, only the new script + docs
