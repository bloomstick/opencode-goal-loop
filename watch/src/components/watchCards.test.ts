import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { sessionBadgeLetter } from "../App.js";

// REQ-03 (centered watching dot) + REQ-04 (letter badges + WIP pulse).
describe("watch card indicator and badges (REQ-03/REQ-04)", () => {
  async function chatCss(): Promise<string> {
    return readFile(new URL("./chat.css", import.meta.url), "utf8");
  }

  function selectedAfterBlock(css: string): string {
    const match = css.match(
      /\.dsp-session-item:has\(\.dsp-session-select\[data-selected="true"\]\)::after\s*\{([\s\S]*?)\}/,
    );
    expect(match, "selected-card ::after rule must exist").toBeTruthy();
    return (match as RegExpMatchArray)[1];
  }

  it("vertically centers the selected-card watching indicator", async () => {
    const block = selectedAfterBlock(await chatCss());
    expect(block).toMatch(/top:\s*50%/);
    expect(block).toMatch(/translateY\(-50%\)/);
    expect(block).not.toMatch(/top:\s*var\(--dsp-sp-2\)/);
  });

  it("renders a letter-avatar badge per session, token-styled", async () => {
    const css = await chatCss();
    expect(css).toContain(".dsp-session-badge");
    expect(css).toContain(".dsp-session-title");
    expect(css).toContain("border-radius: 50%");
    expect(css).toContain("text-overflow: ellipsis");
  });

  it("wires the pulse keyframes to the watched card (CSS only)", async () => {
    const css = await chatCss();
    expect(css).toContain("@keyframes dsp-pulse");
    const watchedBadge = css.match(
      /\.dsp-session-item:has\(\.dsp-session-select\[data-selected="true"\]\) \.dsp-session-badge\s*\{([\s\S]*?)\}/,
    );
    expect(watchedBadge, "watched-card badge rule must exist").toBeTruthy();
    expect((watchedBadge as RegExpMatchArray)[1]).toContain("animation: dsp-pulse");
    expect(selectedAfterBlock(css)).toContain("animation: dsp-pulse");
  });

  it("keeps badge styles on theme tokens with no emoji or images", async () => {
    const css = await chatCss();
    expect(css).not.toContain("url(");
    for (const token of ["--dsp-accent", "--dsp-bg", "--dsp-surface-2", "--dsp-muted"]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("prefers-reduced-motion");
  });

  it("derives the badge letter as first alphanumeric, uppercased", () => {
    expect(sessionBadgeLetter("watch backend")).toBe("W");
    expect(sessionBadgeLetter("  3d printer queue")).toBe("3");
    expect(sessionBadgeLetter("--x-ray")).toBe("X");
    expect(sessionBadgeLetter("!!!")).toBe("?");
    expect(sessionBadgeLetter("")).toBe("?");
  });

  it("keeps session wiring: testids, aria-label, title, data-selected", async () => {
    const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
    expect(app).toContain('data-testid="session-list"');
    expect(app).toContain("aria-pressed");
    expect(app).toContain("data-selected");
    expect(app).toContain("title={session.title}");
    expect(app).toContain("dsp-session-badge");
    expect(app).toContain("sessionBadgeLetter(session.title)");
  });
});
