# Goal: supervisor re-fire carries attachments to fresh orchestrator
Base: 56f60d074053364f6041803112afa830c5a783fc | Date: 2026-10-15 | Slug: goal-attach-orch | Goal-branch: feat/goal-attach-orch
- [x] REQ-01 supervisor appends manifest Attachments -f set on re-fire -- verify: DryRun -f order + ATTACH-MISSING evidence + parse 0 + ascii clean -- status: done
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- inline: 2026-10-15 orchestrator-direct (files: Invoke ps1 + SKILL 2 lines + CHANGELOG; harness note dropped as unnecessary); escalation clock respected (~10 min)
- inline-result: done, verified (parse 0, T1 DryRun both -f in order quoted, T2 ATTACH-MISSING + surviving -f quoted, ascii clean after 1 em-dash fix, fixture removed)
## Log
- 2026-10-15 correction opened; user: attachments must reach the (re-fired) ORCH, not workers; prior AF1 line claiming no supervisor change needed was wrong — fixed in code + skill + changelog
