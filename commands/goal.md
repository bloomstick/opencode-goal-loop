---
description: Start a fully automated coding loop for the given task (requirements, child agents, verification)
agent: goal-orch
subtask: false
---

Load the `goal-loop` skill and follow it exactly.

Goal: $ARGUMENTS

If empty, ask for the task first — do not start the loop on an empty goal.

Phases: clarify requirements with the user (propose best-guess atomics,
`recommend` accepts all) → write `.opencode/goal-loop/<slug>/reqs-manifest.md`
→ DAG → dispatch child agents via foreground `opencode run` (never the
`task`/subagent tool, never background) → integrate sequentially → verify
every requirement against the manifest → report DONE.

No schedules, no watchers, no polling, no background persistence. One
invocation runs to DONE, then stops.

Step 0 - init (orch-side attachments only, FIRST):
1. Derive the goal slug (lowercase words joined with hyphens).
2. Save each user-attached file VERBATIM to
   `.opencode/goal-loop/<slug>/attachments/<original-name>` (create the
   dirs first; only you can see the attachment content, so this save is
   the irreducible AI step - do it before anything else).
3. Run the init script (global copy first, else the repo copy):
   $Init = "$env:USERPROFILE/.config/opencode/goal-loop/scripts/goal-init.ps1"
   if (-not (Test-Path $Init)) { $Init = "scripts/goal-init.ps1" }
   powershell -NoProfile -File $Init -Slug <slug> -Goal "<goal>" -RepoRoot "<repo-root>" (absolute repo path; the script refuses ambient-CWD operation)
4. Quote its MACHINE block into the manifest Log. STOP on failure: if the
   script fails, stop and report - never run blind without the init proof.
