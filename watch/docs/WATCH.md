# Watch

Watch is a read-mostly Tauri + React window onto live OpenCode sessions.
It lists sessions and streams their chat over server-sent events (SSE).
It does not dispatch work, manage worktrees, file issues, or capture
screenshots.

## Run from source

Prerequisites: Node 24, Rust stable, and `opencode` on PATH.

```powershell
npm install
npx tauri dev
```

Before launching, start the service once so the sidecar can find it:

```powershell
opencode serve --service
```

The sidecar reads the service registration file that command maintains
and hands the endpoint to the UI; the UI probes reachability over HTTP
and falls back to offline fixtures when nothing is registered.

## Attended-only

Closing the window stops everything. There is no background state: no
schedules, no services, no watchers, no polling. The single SSE
subscription is demand-driven and disposed on unmount, so nothing
survives the task.
