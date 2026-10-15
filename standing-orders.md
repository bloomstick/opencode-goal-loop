# Standing orders -- goal-loop orchestrator pre-authorizations

Template. The orchestrator reads this file at loop start (after
clarify/resume, per skill sec. 2 step 1) and never gates on a listed
power again; anything outside the list still asks. Edit the checkboxes
to match what you pre-authorize. First install writes this template;
later installs never overwrite your copy (see `Install-GoalLoop.ps1`).

## Pre-authorized powers

- [x] Merge worker branches to local `main` with `git merge --no-ff`
  (one at a time, green suite after each) and push `main` with the
  sec. 7 LAND proof (`ls-remote origin main` SHA equals local `main`
  AND every worker commit contained in `origin/main`).
- [x] Push tags ONLY on an explicit publish order from the user.
  Default stays: releases pending owner, no tags pushed.
- [x] Remove TEMP worktrees after landing (`git worktree remove`).
- [x] Delete merged remote worker branches, but ONLY after the LAND
  proof shows they are contained in `origin/main`. Unmerged or
  unproven branches are kept and asked about.
- [x] Open + merge release PRs ONLY on an explicit order from the user
  (solo flow default stays: no PRs, merge locally per sec. 7).

## What standing orders can NEVER authorize

Standing orders cannot override skill sec. 0 hard rules, no exceptions:

- NEVER the `task`/subagent tool (unavailable on free tier, denied in
  frontmatter).
- NEVER background `opencode run` (no `background: true`, no holding it
  server-side, no `&`, no `nohup`). Foreground only.
- NEVER schedules, services, watchers, polling loops, idle hooks, or
  background persistence. One invocation runs to DONE, `blocked`, or
  `blocked-transient`, then stops.
- NEVER unbounded waits or condition polling. Transient retries stay
  bounded per sec. 2 step 5 (max 3 immediate re-dispatches, no waits).

Any line below that claims one of the above is void.

<!--
## Extend your own (examples -- uncomment + edit)

Uncomment the lines you want, keep the rest commented. Anything you add
here must still respect the NEVER list above; the orchestrator keeps
asking for anything unlisted.

- [ ] Delete local scratch worktrees on sight (only paths under $TEMP
  matching `work-<slug>-*`, never the goal worktree itself).
- [ ] Push `main` without asking on every green LAND proof (still prove
  per sec. 7; proof failure still fails loudly, never silent).
- [ ] Clean merged local worker branches after the report is accepted
  (`git branch -d`, only branches already contained in `main`).
-->
