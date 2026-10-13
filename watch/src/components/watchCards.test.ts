import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isSessionWorking, sessionBadgeLetter } from "../App.js";
import type { ChatMessage } from "./SessionChat.js";

function chatMessage(overrides: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    sessionId: "ses-1",
    role: "assistant",
    text: "",
    createdAt: "2026-10-07T00:01:00.000Z",
    ...overrides,
  };
}

// WWIP: a session counts as working ONLY on positive live evidence (a
// folded tool call with status "running") - never on mere selection.
describe("watch card working signal (WWIP)", () => {
  it("counts as working on a folded running tool call", () => {
    const messages = [
      chatMessage({
        id: "m-1",
        toolCalls: [{ id: "t-1", name: "read", input: "", status: "running" }],
      }),
    ];
    expect(isSessionWorking(messages, "ses-1")).toBe(true);
  });

  it("stays working with mixed settled calls until all settle", () => {
    const messages = [
      chatMessage({
        id: "m-1",
        toolCalls: [
          { id: "t-1", name: "read", input: "", status: "done" },
          { id: "t-2", name: "edit", input: "", status: "running" },
        ],
      }),
    ];
    expect(isSessionWorking(messages, "ses-1")).toBe(true);
  });

  it("reads done/error/no-tool messages as idle", () => {
    const settled = [
      chatMessage({
        id: "m-1",
        toolCalls: [{ id: "t-1", name: "read", input: "", status: "done" }],
      }),
      chatMessage({
        id: "m-2",
        toolCalls: [{ id: "t-2", name: "edit", input: "", status: "error" }],
      }),
      chatMessage({ id: "m-3", text: "plain text" }),
    ];
    expect(isSessionWorking(settled, "ses-1")).toBe(false);
    expect(isSessionWorking([], "ses-1")).toBe(false);
  });

  it("never counts mere selection: other sessions and null read idle", () => {
    const messages = [
      chatMessage({
        id: "m-1",
        toolCalls: [{ id: "t-1", name: "read", input: "", status: "running" }],
      }),
    ];
    expect(isSessionWorking(messages, "ses-9")).toBe(false);
    expect(isSessionWorking(messages, null)).toBe(false);
    expect(isSessionWorking([], null)).toBe(false);
  });
});

// WWIP: the letter badge swaps to a spinner while working; the selected
// green dot is gone; the selected accent border stays.
describe("watch card badge swap and dot removal (WWIP)", () => {
  async function chatCss(): Promise<string> {
    return readFile(new URL("./chat.css", import.meta.url), "utf8");
  }

  it("deletes the selected-card green dot", async () => {
    const css = await chatCss();
    expect(css).not.toMatch(
      /\.dsp-session-item:has\(\.dsp-session-select\[data-selected="true"\]\)::after/,
    );
  });

  it("keeps the selected-card accent highlight, idle cards unchanged", async () => {
    const css = await chatCss();
    const selected = css.match(
      /\.dsp-session-item:has\(\.dsp-session-select\[data-selected="true"\]\)\s*\{([\s\S]*?)\}/,
    );
    expect(selected, "selected-card accent rule must remain").toBeTruthy();
    expect((selected as RegExpMatchArray)[1]).toContain("var(--dsp-accent)");
    expect(css).toContain(".dsp-session-badge");
    expect(css).toContain(".dsp-session-title");
    expect(css).toContain("text-overflow: ellipsis");
  });

  it("swaps the badge for a CSS-only spinner while working", async () => {
    const css = await chatCss();
    expect(css).toContain(".dsp-spinner");
    expect(css).toContain("@keyframes dsp-spin");
    expect(css).toContain(".dsp-session-badge[data-working=");
    const spinner = css.match(/\.dsp-spinner\s*\{([\s\S]*?)\}/);
    expect(spinner, ".dsp-spinner rule must exist").toBeTruthy();
    expect((spinner as RegExpMatchArray)[1]).toContain("border-radius: 50%");
    const animated = css.match(
      /\.dsp-session-badge\[data-working="true"\] \.dsp-spinner\s*\{([\s\S]*?)\}/,
    );
    expect(animated, "working badge must animate the spinner").toBeTruthy();
    expect((animated as RegExpMatchArray)[1]).toContain("animation: dsp-spin");
  });

  it("never animates on selection alone", async () => {
    const css = await chatCss();
    expect(css).not.toMatch(/data-selected="true"[^}]*animation:/);
  });

  it("keeps spinner styles on theme tokens with no emoji or images", async () => {
    const css = await chatCss();
    expect(css).not.toContain("url(");
    for (const token of ["--dsp-accent", "--dsp-border", "--dsp-surface-2"]) {
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

  it("keeps session wiring: testids, aria working text, data-working", async () => {
    const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
    expect(app).toContain('data-testid="session-list"');
    expect(app).toContain("aria-pressed");
    expect(app).toContain("data-selected");
    expect(app).toContain("data-working");
    expect(app).toContain("dsp-session-badge");
    expect(app).toContain("dsp-spinner");
    expect(app).toContain("isSessionWorking(messages, session.id)");
    expect(app).toContain("sessionBadgeLetter(session.title)");
    expect(app).toContain("watch ${session.id} working");
    expect(app).toContain('title={session.title}');
  });
});
