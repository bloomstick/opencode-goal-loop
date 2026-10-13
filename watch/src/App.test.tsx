import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// Watch-only App pins: live session list + SessionChat mount, attended-only
// subscription, no dispatch/board/autopilot surfaces, no timers or storage.
describe("App watch-only shell (WUI)", () => {
  async function appSrc(): Promise<string> {
    return readFile(new URL("./App.tsx", import.meta.url), "utf8");
  }

  it("mounts the session list via SessionManager plus SessionChat for the selection", async () => {
    const src = await appSrc();
    expect(src).toContain("SessionChat");
    expect(src).toContain(".list(");
    expect(src).toContain("SessionManager");
    expect(src).toContain("ensureClient");
    expect(src).toContain("useLiveSession");
    expect(src).toContain("ChatScroll");
    expect(src).toContain('data-testid="session-list"');
    expect(src).toContain('data-testid="watch-pane"');
  });

  it("has no Board/Architect/Autopilot/dispatch surfaces", async () => {
    const src = await appSrc();
    for (const banned of [
      "Board",
      "Architect",
      "Autopilot",
      "RunList",
      "RunWorkspace",
      "SelfImprove",
      "UnstartedCard",
      "dispatchNext",
      "GhClient",
      "WorktreeManager",
      "SidecarStore",
      "fixtureBoard",
      "fixtureMessages",
      "fixtureRuns",
    ]) {
      expect(src, `must not contain ${banned}`).not.toContain(banned);
    }
  });

  it("is attended-only: null selection opens nothing, unmount disposes", async () => {
    const src = await appSrc();
    expect(src).toContain("selectedId");
    expect(src).toContain("setSelectedId(null)");
    expect(src).toContain("disposeAll()");
    expect(src).toContain('aria-label="clear selection"');
  });

  it("adds no polling loops, background persistence, or new network targets", async () => {
    const src = await appSrc();
    expect(src).not.toMatch(/setTimeout\s*\(|setInterval\s*\(|setImmediate\s*\(|requestAnimationFrame\s*\(/);
    expect(src).not.toContain("localStorage");
    expect(src).not.toContain("sessionStorage");
    expect(src).not.toMatch(/\.prompt\(|\.create\(/);
    expect(src).not.toMatch(/\.status\s*=(?![=>])/);
  });

  it("keeps the theme toggle and the reload affordance", async () => {
    const src = await appSrc();
    expect(src).toContain('aria-label="toggle theme"');
    expect(src).toContain('aria-label="reload sessions"');
  });

  it("styles the session list as cards without changing wiring", async () => {
    const src = await appSrc();
    expect(src).toContain('className="dsp-sessions"');
    expect(src).toContain('className="dsp-session-item"');
    expect(src).toContain('className="dsp-session-select"');
    expect(src).toContain('data-testid="session-list"');
    expect(src).toContain("aria-pressed");
    expect(src).toContain("data-selected");
    expect(src).toContain("title={session.title}");
  });

  it("styles service-status as a badge driven by data-live", async () => {
    const src = await appSrc();
    expect(src).toContain('data-testid="service-status"');
    expect(src).toContain('className="dsp-status"');
    expect(src).toContain("data-live={String(live)}");
  });
});
