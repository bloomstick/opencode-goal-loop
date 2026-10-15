# Goal: load-aware supervisor firing (never pile onto a busy machine)
Base: 690c40afef7cb515d75267e7f3cd11d1a4ace2bc | Date: 2026-10-15 | Slug: goal-loadgate | Goal-branch: feat/goal-loadgate
- [ ] REQ-01 load gate + wake grace -- verify: BUSY-SKIP on loaded fixture + fire on idle + wake-grace after GAP + ascii scan + no live tasks left -- status: pending
## DAG
- REQ-01: no deps
## Runs
## Log
- 2026-10-15 goal opened; incident: 3 STALL re-fires piled ComfyUI workers onto manual image gen, PC killed 3x; supervisor blind to machine load; char-adapt disarmed for the duration; nvidia-smi absent on this machine (GPU check must be best-effort)
