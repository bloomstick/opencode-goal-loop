# Watch

Unofficial watch-only window onto [OpenCode](https://opencode.ai) sessions.
Unofficial project, not affiliated with OpenCode. It lists sessions and
streams their chat live over SSE. It dispatches nothing: no worktrees, no
GitHub calls, no screenshots, no background state.

## Install

Download the `0.1.0` Release asset or run from source -- full steps in
[`docs/WATCH.md`](docs/WATCH.md):

```powershell
npm install
npx tauri dev
```

## Attended-only

Closing the window stops everything. There is no background state: no
schedules, no services, no watchers, no polling. Start
`opencode serve --service` first, then open the window and watch.

## Project status

`0.1.0` unsigned alpha -- Windows NSIS + MSI bundles, no auto-updater yet,
no code-signing certificate (SmartScreen "Unknown publisher" is expected).
