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
