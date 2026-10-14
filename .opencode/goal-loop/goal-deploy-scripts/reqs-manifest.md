# Goal: deploy supervisor scripts globally via installer
Base: 992e2cc4673b108f141d00bc88a2e0687101e51f | Date: 2026-10-14 | Slug: goal-deploy-scripts | Goal-branch: feat/goal-deploy-scripts
- [ ] REQ-01 installer deploys scripts + skill resolves global copy -- verify: installer run drops both ps1 files parse-clean in global dir + skill/harness reference global-copy-else-repo + ascii scan -- status: pending
## DAG
- REQ-01: no deps
## Runs
### REQ-01
- dispatch: 2026-10-14 branch feat/goal-deploy-req01 prompt `prompts/REQ-01.GD1.md` order "Implement REQ-01 installer deploys scripts + references per prompt file" re-fires: 0/3 retries: 0/3
## Log
- 2026-10-14 goal opened; gap: installed skill references supervisor scripts that exist only in repo checkouts
