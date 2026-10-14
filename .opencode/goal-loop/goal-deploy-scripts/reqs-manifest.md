# Goal: deploy supervisor scripts globally via installer
Base: 992e2cc4673b108f141d00bc88a2e0687101e51f | Date: 2026-10-14 | Slug: goal-deploy-scripts | Goal-branch: feat/goal-deploy-scripts
- [x] REQ-01 installer deploys scripts + skill resolves global copy -- verify: installer run drops both ps1 files parse-clean in global dir + skill/harness reference global-copy-else-repo + ascii scan -- status: done
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-deploy-req01 prompt `prompts/REQ-01.GD1.md` order "Implement REQ-01 installer deploys scripts + references per prompt file" re-fires: 0/3 retries: 0/3
- run1: 2026-10-14 pushed: 52e8b20 | report: ok | acceptance: ok (parse clean, sandbox hashes match, bare-ref grep 0, ascii empty)
- pushed: 52e8b20 (verified ls-remote) | report-tail: GD1 block last, SLOC +26/-7
- integrated: local main 29045e7 (merge --no-ff of pushed proof; green re-run post-merge: ascii 26/0, parse 0, bare-ref 0)
## Log
- 2026-10-14 goal opened; gap: installed skill references supervisor scripts that exist only in repo checkouts
- 2026-10-14 REQ-01 done by feat/goal-deploy-req01 (52e8b20) — merged to main as 29045e7, green suite re-run clean
