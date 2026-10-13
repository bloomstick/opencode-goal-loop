# opencode-goal-loop

Fully automated coding loop for OpenCode — **no plugins, no hooks, no server
code**. A `/goal` command plus `goal-orch` / `goal-worker` agents plus the
`goal-loop` skill, all plain Markdown. Nothing to crash the service.

Why: `prevalentWare/opencode-goal-plugin` restarted the OpenCode server 3
times on 2026-10-12 via server-held background `opencode run` children, and
`william-ricchiuti/OpenCode-goal-plugin#81` reports silent service death on
`0.11.0`. This loop never auto-continues via hooks, never backgrounds
`opencode run`, and keeps state in one plain `reqs-manifest.md` per goal —
no lock/lease/claim files.

Free-tier safe: the `task` (subagent) tool is denied in both agents. All
child work runs as foreground `opencode run` processes.

## Layout (repo = truth source)

- `commands/goal.md` → global `~/.config/opencode/commands/goal.md` (`/goal`)
- `agents/goal-orch.md`, `agents/goal-worker.md` → global `agents/`
- `skills/goal-loop/SKILL.md` → global `skills/goal-loop/` (canonical spec)
- `scripts/Install-GoalLoop.ps1` — clone/pull + copy installer

## Install / update

```powershell
.\scripts\Install-GoalLoop.ps1
# restart OpenCode, then:
/goal build a typing practice web app for kids
```

Re-run the script to update (it `git pull`s the source clone and re-copies).
Source: `https://github.com/bloomstick/opencode-goal-loop`.

## Loop in brief

`/goal <task>` → clarify → `reqs-manifest.md` → DAG → foreground child
agents (in noveldream: `tools/dispatch/` scripts) → sequential integration
→ verify → DONE. Full spec in `skills/goal-loop/SKILL.md`.
