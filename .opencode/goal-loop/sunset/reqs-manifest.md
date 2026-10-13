# Goal: sunset duplicate orchestration everywhere (single source: goal-loop)
Base: multi-repo (nov ca64d9d, orc b5ae7de, mon 3f695a2e, arc d5a6c8f) | Date: 2026-10-13
- [ ] REQ-NOV noveldream: delete untracked .opencode/goals/ plugin state; chapter-factory doc + emitted text to foreground dispatch
- [ ] REQ-ORC dream-orchestrator: remove live system from main (skills, prompts, dispatcher, templates, walkthrough, state) + tombstone README
- [ ] REQ-MON monorepo: delete .opencode/goals/ state; AGENTS delegation to pointer (merge_to_main seam untouched, flagged); doorway repoint
- [ ] REQ-ARC the-architect doorway: repoint to goal-loop (stub + installer + README)
- [ ] REQ-LAND land each repo locally (merge --no-ff, green, push, ls-remote proof) + cleanup
## DAG
- REQ-NOV/ORC/MON/ARC: no deps (disjoint repos)
- REQ-LAND: after all four
## Log
- Stale worktrees/opencode-agent worktree removed by orchestrator (branch feat/menu-overhaul kept, unmerged work preserved in repo).
- All four workers green; landed per repo with ls-remote proof (see report).
  Two live-main conflicts resolved: orchestrator (checked-out WIP branch
  restored pristine, merged on main) and monorepo (kept new placement rule
  + new delegation pointer).
