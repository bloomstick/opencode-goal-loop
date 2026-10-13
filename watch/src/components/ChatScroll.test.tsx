import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// REQ-02 component pins: ChatScroll follows streamed growth to the TRUE
// bottom (scrollHeight - clientHeight), re-arms on in-place delta growth via
// contentKey, measures after commit, and keeps respect + reduced-motion.
describe("ChatScroll true-bottom follow (REQ-02)", () => {
  async function src(): Promise<string> {
    return readFile(new URL("./ChatScroll.tsx", import.meta.url), "utf8");
  }

  it("snaps to the true bottom, never raw scrollHeight", async () => {
    const text = await src();
    expect(text).toContain("bottomScrollTop");
    expect(text).toMatch(/scrollHeight\s*-\s*.*clientHeight|bottomScrollTop\(\{/);
    expect(text).not.toMatch(/scrollTop\s*=\s*el\.scrollHeight[^ ]/);
    expect(text).not.toMatch(/top:\s*el\.scrollHeight[^ ]/);
  });

  it("re-arms follow on in-place delta growth via contentKey", async () => {
    const text = await src();
    expect(text).toContain("contentKey");
    expect(text).toMatch(/contentKey\?\s*:\s*number/);
    expect(text).toMatch(/\[messageCount,\s*contentKey,\s*follow\]/);
  });

  it("measures after commit for long messages", async () => {
    const text = await src();
    expect(text).toContain("useLayoutEffect");
  });

  it("keeps respect-user-scroll-up, reduced-motion, and the jump control", async () => {
    const text = await src();
    expect(text).toContain("isNearBottom");
    expect(text).toContain("setFollow(near)");
    expect(text).toContain("prefersReducedMotion()");
    expect(text).toContain('data-testid="chat-jump-latest"');
    expect(text).toContain('aria-label="jump to latest"');
    expect(text).toContain("Jump to latest");
    expect(text).toContain('data-testid="chat-scroll"');
    expect(text).toContain("onScroll={handleScroll}");
  });

  it("adds no timers, polling, or fetching", async () => {
    const text = await src();
    expect(text).not.toMatch(/setTimeout\s*\(|setInterval\s*\(|setImmediate\s*\(|requestAnimationFrame\s*\(/);
    expect(text).not.toContain("fetch(");
  });
});
