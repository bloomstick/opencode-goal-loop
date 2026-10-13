import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SessionChat from "./SessionChat.js";
import type { ChatMessage } from "./SessionChat.js";

const sample: ChatMessage[] = [
  {
    id: "msg-1",
    sessionId: "ses-1",
    role: "user",
    text: "Refactor sessions to own one AbortController per session.",
    createdAt: "2026-10-07T00:01:00.000Z",
  },
  {
    id: "msg-2",
    sessionId: "ses-1",
    role: "assistant",
    text: "Done - the manager owns the seam.",
    reasoning: [{ id: "rsn-1", text: "Check client session signatures first." }],
    toolCalls: [{ id: "tool-1", name: "read src/lib/sessions.ts", input: "{}", status: "done" }],
    diffs: [
      {
        id: "diff-1",
        path: "src/lib/sessions.ts",
        diff: "--- a/src/lib/sessions.ts\n+++ b/src/lib/sessions.ts\n@@\n-abort\n+abortLocal",
      },
    ],
    createdAt: "2026-10-07T00:02:00.000Z",
  },
];

describe("SessionChat watch renderer", () => {
  it("collapses reasoning by default and shows it expanded", () => {
    const collapsed = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed />);
    expect(collapsed).toContain("thoughts");
    expect(collapsed).not.toContain("Check client session signatures");
    expect(collapsed).toContain('data-testid="session-chat"');

    const expanded = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed={false} />);
    expect(expanded).toContain("Check client session signatures");
  });

  it("renders tool-call rows and diff preview rows", () => {
    const html = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed={false} />);
    expect(html).toContain("read src/lib/sessions.ts");
    expect(html).toContain("src/lib/sessions.ts");
    expect(html).toContain("abortLocal");
    expect(html).toContain('data-testid="diff-diff-1"');
  });

  it("shows the watch empty copy with no messages", () => {
    const html = renderToStaticMarkup(<SessionChat messages={[]} />);
    expect(html).toContain('data-testid="chat-empty"');
    expect(html).toContain("select a session");
  });

  it("source uses stable keys, never index keys for live rows", async () => {
    const chatSrc = await readFile(new URL("./SessionChat.tsx", import.meta.url), "utf8");
    expect(chatSrc).toMatch(/key=\{message\.id\}/);
    expect(chatSrc).toMatch(/key=\{block\.id\}/);
    expect(chatSrc).not.toMatch(/key=\{i\}/);
    expect(chatSrc).not.toMatch(/key=\{index\}/);
  });

  it("renders running tool rows with data-status for the pulse", () => {
    const running: ChatMessage[] = [
      {
        id: "msg-r",
        sessionId: "ses-1",
        role: "assistant",
        text: "Working.",
        toolCalls: [{ id: "tool-r", name: "read file", input: "{}", status: "running" }],
        createdAt: "2026-10-07T00:03:00.000Z",
      },
    ];
    const html = renderToStaticMarkup(<SessionChat messages={running} />);
    expect(html).toContain('data-status="running"');
    expect(html).toContain("read file");
  });
});

describe("WUI2 watch list polish", () => {
  async function chatCss(): Promise<string> {
    return readFile(new URL("./chat.css", import.meta.url), "utf8");
  }

  it("pulses the running tool dot via dsp-pulse", async () => {
    const css = await chatCss();
    expect(css).toContain(".dsp-dot[data-status=\"running\"]");
    expect(css).toContain("animation: dsp-pulse");
    expect(css).toContain("@keyframes dsp-pulse");
  });

  it("marks the watched session card via CSS only", async () => {
    const css = await chatCss();
    expect(css).toContain(".dsp-sessions");
    expect(css).toContain(".dsp-session-item");
    expect(css).toContain(".dsp-session-select");
    expect(css).toContain("list-style: none");
    expect(css).toContain("text-overflow: ellipsis");
    expect(css).toContain(".dsp-session-item:has(.dsp-session-select[data-selected=\"true\"])");
    // WWIP: the green selected dot is gone; the accent border stays and
    // the working spinner swaps the badge only on live running tools.
    expect(css).not.toContain(
      ".dsp-session-item:has(.dsp-session-select[data-selected=\"true\"])::after",
    );
    expect(css).toContain(".dsp-spinner");
    expect(css).toContain("@keyframes dsp-spin");
  });

  it("styles the service-status badge from data-live", async () => {
    const css = await chatCss();
    expect(css).toContain(".dsp-status");
    expect(css).toContain(".dsp-status[data-live=\"true\"]");
    expect(css).toContain(".dsp-status::before");
  });

  it("keeps reduced-motion covering all animation", async () => {
    const css = await chatCss();
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("animation: none");
  });

  it("prunes deleted-component rules", async () => {
    const css = await chatCss();
    for (const dead of [
      ".dsp-board",
      ".dsp-runs",
      ".dsp-run",
      ".dsp-panel",
      ".dsp-unstarted",
      ".dsp-workspace",
      ".dsp-heartbeat",
      ".dsp-legend",
      ".dsp-kill",
      ".dsp-repo-",
      ".dsp-repos-",
      ".dsp-rail",
      ".dsp-accordion",
      ".dsp-main-col",
      ".dsp-main-grid",
      ".dsp-chat-pane",
      ".dsp-tabs",
      ".dsp-intro",
      ".dsp-about",
      ".dsp-meta-line",
      ".dsp-topbar-status",
    ]) {
      expect(css, `pruned ${dead}`).not.toContain(dead);
    }
  });
});
